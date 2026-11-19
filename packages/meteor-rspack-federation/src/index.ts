/**
 * Module Federation for Meteor's Rspack integration (Meteor 3.4+).
 *
 * Adding `ModuleFederationPlugin` to a Meteor `rspack.config.ts` builds, but
 * the output can't work, for two reasons:
 *
 * 1. Meteor's client output is `library: commonjs2`, because Meteor's module
 *    system loads the Rspack bundle. MF inherits that, and browsers can't load
 *    a commonjs2 `remoteEntry.js`.
 * 2. Meteor marks `react`, `react-dom` and `meteor/*` as externals, so Meteor
 *    supplies them at runtime. Externals beat MF's ConsumeShared, so nothing
 *    is shared and exposed chunks contain a `require("react")` that crashes on
 *    any other page.
 *
 * `meteorFederation()` returns the plugins that fix this:
 *
 * - The MF container is emitted as a browser `var` library.
 * - Externals are scoped. Modules under `federatedDir` resolve the shared
 *   specifiers through the MF share scope (`import: false`, so the host must
 *   provide them). All other app code keeps Meteor's externals, as before.
 * - A generated "provider" module goes first in the app's main entry and
 *   registers the page's own Meteor-managed React and `meteor/*` packages into
 *   the share scope. It can't be an MF `runtimePlugin`: those are also bundled
 *   into the container, where Meteor's `require` doesn't exist.
 * - Remote URLs can be overridden at runtime from `Meteor.settings`.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Compiler, RspackPluginInstance } from "@rspack/core";
import type { moduleFederationPlugin } from "@module-federation/sdk";

/** The subset of the `Meteor` object `defineConfig` passes to rspack.config.ts. */
export interface MeteorBuildEnv {
  isClient: boolean;
  isDevelopment: boolean;
  isRun: boolean;
}

export interface MeteorFederationOptions {
  /** MF container name, e.g. "meteor_remote". Must be a valid JS identifier. */
  name: string;
  /** Modules to expose. Files must live under `federatedDir`. */
  exposes?: Record<string, string>;
  /** Remotes this app imports from, as `name -> manifest URL`. */
  remotes?: Record<string, string>;
  /**
   * Read `Meteor.settings.public[settingsKey]` (`name -> manifest URL`) at
   * startup and let it override `remotes`, so each environment can point at
   * its own deployments without rebuilding. Default: "remotes".
   */
  settingsKey?: string | false;
  /** Where exposed code lives. Default: "imports/federated". */
  federatedDir?: string;
  /**
   * Absolute origin this app is served from, used as the container's public
   * path. Required when `exposes` is set.
   */
  origin?: string;
  /**
   * Specifiers a host provides and a remote consumes, with the range a remote
   * requires (`false` for any). Default: {@link DEFAULT_SHARED}.
   */
  shared?: Record<string, string | false>;
}

/** What a Meteor page provides, and what federated Meteor code may import from it. */
export const DEFAULT_SHARED: Record<string, string | false> = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
  "react/jsx-runtime": "^19.0.0",
  "react/jsx-dev-runtime": "^19.0.0",
  "meteor/meteor": false,
  "meteor/mongo": false,
  "meteor/ddp-client": false,
  "meteor/react-meteor-data": false,
};

const PLUGIN = "MeteorFederationPlugin";

/** Meteor's default client externals (see @meteorjs/rspack). */
const isMeteorDefaultExternal = (item: unknown) =>
  item instanceof RegExp && ["^meteor\\/.*", "^react$", "^react-dom$"].includes(item.source);

type ExternalItemFn = (
  data: { request?: string; contextInfo?: { issuer?: string } },
  callback: (err?: Error | null, result?: string) => void,
) => void;

class ScopedMeteorExternalsPlugin implements RspackPluginInstance {
  federatedDir: string;
  shared: Set<string>;

  constructor(federatedDir: string, shared: string[]) {
    this.federatedDir = federatedDir;
    this.shared = new Set(shared);
  }

  apply(compiler: Compiler) {
    const { federatedDir, shared } = this;
    const rest = ([] as unknown[])
      .concat(compiler.options.externals ?? [])
      .filter((item) => !isMeteorDefaultExternal(item));

    const scoped: ExternalItemFn = ({ request, contextInfo }, callback) => {
      if (!request) return callback();
      const isMeteorPackage = request.startsWith("meteor/");
      if (!isMeteorPackage && !shared.has(request)) return callback();

      const issuer = contextInfo?.issuer ?? "";
      if (issuer.startsWith(federatedDir + path.sep)) {
        if (shared.has(request)) return callback(); // -> ConsumeShared
        return callback(
          new Error(
            `[${PLUGIN}] ${request} is imported by federated code (${issuer}) but is not shared. ` +
              `Add it to the "shared" option so hosts provide it.`,
          ),
        );
      }
      return callback(null, request); // Meteor's module system supplies it
    };

    compiler.options.externals = [scoped, ...rest] as typeof compiler.options.externals;
  }
}

/** Puts a module first in the main entry, ahead of Meteor's client entry. */
class PrependEntryPlugin implements RspackPluginInstance {
  file: string;

  constructor(file: string) {
    this.file = file;
  }

  apply(compiler: Compiler) {
    const entry = compiler.options.entry as Record<string, { import?: string[] }>;
    const main = typeof entry === "object" ? entry.main : undefined;
    if (!main?.import) {
      throw new Error(`[${PLUGIN}] expected Meteor's client entry at entry.main.import`);
    }
    main.import.unshift(this.file);
  }
}

/** Adds CORS to the dev server so hosts on other origins can fetch the manifest. */
class DevServerCorsPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    const options = compiler.options as { devServer?: { headers?: Record<string, string> } };
    if (!options.devServer) return;
    options.devServer.headers = { "Access-Control-Allow-Origin": "*", ...options.devServer.headers };
  }
}

/** Source of the provider module: register this page's Meteor-managed modules. */
function providerSource(name: string, shared: Record<string, string | false>, settingsKey: string | false) {
  const specifiers = Object.keys(shared);
  const imports = specifiers.map((s, i) => `import * as m${i} from ${JSON.stringify(s)};`);
  const entries = specifiers.map((s, i) => {
    const version = s.startsWith("react") ? "reactVersion" : "meteorVersion";
    const config = JSON.stringify({ singleton: true, requiredVersion: shared[s] });
    return `  ${JSON.stringify(s)}: { version: ${version}, lib: () => m${i}, shareConfig: ${config} },`;
  });

  return `// Generated by meteor-rspack-federation. Do not edit.
import { getInstance } from "@module-federation/enhanced/runtime";
import { Meteor } from "meteor/meteor";
import { version as reactVersion } from "react";
${imports.join("\n")}

const meteorVersion = (Meteor.release || "").split("@")[1] || "3.0.0";
const federation = getInstance((instance) => instance.name === ${JSON.stringify(name)});
if (!federation) throw new Error("[${PLUGIN}] federation instance ${name} was not created");

federation.registerShared({
${entries.join("\n")}
});
${
  settingsKey
    ? `
const fromSettings = Meteor.settings?.public?.[${JSON.stringify(settingsKey)}];
if (fromSettings) {
  federation.registerRemotes(
    Object.entries(fromSettings).map(([remoteName, entry]) => ({ name: remoteName, entry })),
    { force: true },
  );
}`
    : ""
}
`;
}

/**
 * Plugins for a Meteor client build. Returns `[]` for the server build.
 *
 * ```ts
 * plugins: [...meteorFederation(Meteor, { name: "meteor_host", remotes: { ... } })]
 * ```
 */
export function meteorFederation(meteor: MeteorBuildEnv, options: MeteorFederationOptions): RspackPluginInstance[] {
  if (!meteor.isClient) return [];

  const projectDir = process.cwd();
  // Resolve MF from the app, so the bundled runtime and the app agree on one copy.
  const appRequire = createRequire(path.join(projectDir, "package.json"));
  const { ModuleFederationPlugin } = appRequire(
    "@module-federation/enhanced/rspack",
  ) as typeof import("@module-federation/enhanced/rspack");

  const shared = options.shared ?? DEFAULT_SHARED;
  const federatedDir = path.resolve(projectDir, options.federatedDir ?? "imports/federated");
  const settingsKey = options.settingsKey ?? "remotes";
  const isRemote = Boolean(options.exposes && Object.keys(options.exposes).length);

  // The generated provider is plain JS; node_modules/.cache keeps it out of
  // Meteor's SWC rule, the app's tsconfig and git.
  const providerFile = path.join(projectDir, "node_modules/.cache/meteor-rspack-federation", `${options.name}.provide.mjs`);
  mkdirSync(path.dirname(providerFile), { recursive: true });
  writeFileSync(providerFile, providerSource(options.name, shared, settingsKey));

  const mfOptions: moduleFederationPlugin.ModuleFederationPluginOptions = {
    name: options.name,
    remotes: Object.fromEntries(
      Object.entries(options.remotes ?? {}).map(([name, url]) => [name, `${name}@${url}`]),
    ),
    // Declared so MF builds a share scope; values come from the provider.
    shared: Object.fromEntries(
      Object.entries(shared).map(([name, requiredVersion]) => [
        name,
        { singleton: true, import: false, requiredVersion },
      ]),
    ),
    dts: false,
  };

  if (isRemote) {
    if (!options.origin) throw new Error(`[${PLUGIN}] "origin" is required when "exposes" is set`);
    // In `meteor run` client assets are served by the Rspack dev server,
    // proxied by Meteor under /__rspack__/. Builds put them in public/.
    const publicPath = meteor.isDevelopment && meteor.isRun ? `${options.origin}/__rspack__/` : `${options.origin}/`;
    Object.assign(mfOptions, {
      filename: "remoteEntry.js",
      exposes: options.exposes,
      // Meteor's client output is commonjs2; a browser container must not be.
      library: { type: "var", name: options.name },
      // Applies to the container entry only; Meteor's main entry keeps "/".
      getPublicPath: `return ${JSON.stringify(publicPath)}`,
      manifest: true,
    });
  }

  return [
    new ScopedMeteorExternalsPlugin(federatedDir, Object.keys(shared)),
    new PrependEntryPlugin(providerFile),
    ...(isRemote ? [new DevServerCorsPlugin()] : []),
    new ModuleFederationPlugin(mfOptions) as unknown as RspackPluginInstance,
  ];
}

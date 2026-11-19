import { defineConfig } from "@meteorjs/rspack";
import { TsCheckerRspackPlugin } from "ts-checker-rspack-plugin";
import { meteorFederation } from "../../packages/meteor-rspack-federation/src/index.ts";

/**
 * meteor_host: imports federated modules with plain `import("meteor_remote/...")`.
 *
 * The URLs here are build-time defaults. Meteor.settings.public.remotes
 * overrides them at startup (see settings*.json), so a deployed host can
 * point at other remote deployments without a rebuild.
 */
export default defineConfig((Meteor) => {
  const meteorRemote = process.env.METEOR_REMOTE_URL ?? "http://localhost:4000";
  return {
    module: {
      rules: [{ test: /\.svg$/i, issuer: /\.[jt]sx?$/, use: ["@svgr/webpack"] }],
    },
    plugins: [
      new TsCheckerRspackPlugin({ typescript: { tsgo: true } }),
      ...meteorFederation(Meteor, {
        name: "meteor_host",
        remotes: {
          meteor_remote: Meteor.isDevelopment
            ? `${meteorRemote}/__rspack__/mf-manifest.json`
            : `${meteorRemote}/mf-manifest.json`,
          remote_widgets: process.env.REMOTE_WIDGETS_URL ?? "http://localhost:3030/mf-manifest.json",
        },
      }),
    ],
  };
});

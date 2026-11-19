/**
 * Module Federation for a Meteor-Rspack app.
 *
 * Meteor's Rspack integration marks `react`, `react-dom` and every `meteor/*`
 * import as a commonjs2 external, so Meteor's own module system supplies them
 * at runtime. That is right for the app itself, but a federated module runs
 * on somebody else's page, where no Meteor `require` exists. And because
 * externals win over MF's ConsumeShared, the MF plugin alone would emit
 * `require("react")` into the exposed chunk and an empty `shared` list.
 *
 * `MeteorFederatedExternalsPlugin` fixes that by scoping the externals:
 * modules inside FEDERATED_DIR resolve these imports through the MF share
 * scope (filled by the host), and everything else stays a Meteor external,
 * exactly as before.
 */
const path = require("path");

const FEDERATED_DIR = path.resolve(__dirname, "imports/federated");

// The modules a federated Meteor component borrows from its host.
const HOST_PROVIDED = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "meteor/meteor",
  "meteor/mongo",
  "meteor/ddp-client",
  "meteor/react-meteor-data",
];

const isMeteorDefaultExternal = (item) =>
  item instanceof RegExp &&
  ["^meteor\\/.*", "^react$", "^react-dom$"].includes(item.source);

class MeteorFederatedExternalsPlugin {
  apply(compiler) {
    const rest = [].concat(compiler.options.externals || []).filter(
      (item) => !isMeteorDefaultExternal(item)
    );
    const shareable = new Set(HOST_PROVIDED);

    compiler.options.externals = [
      ({ request, contextInfo }, callback) => {
        const isMeteorRuntime = /^meteor\//.test(request);
        if (!isMeteorRuntime && !shareable.has(request)) return callback();
        // Federated code: leave it to ConsumeShared (the host provides it).
        if (contextInfo?.issuer?.startsWith(FEDERATED_DIR)) {
          if (!shareable.has(request)) {
            return callback(
              new Error(
                `${request} is imported from ${contextInfo.issuer} but is not in HOST_PROVIDED (federation.config.js)`
              )
            );
          }
          return callback();
        }
        // App code: keep Meteor's behaviour.
        return callback(null, request);
      },
      ...rest,
    ];
  }
}

// Where the host should load this remote's chunks from. A real deployment
// would point this at its CDN or ROOT_URL at build time.
const remoteOrigin = process.env.METEOR_REMOTE_URL || "http://localhost:4000";

function federation(Meteor) {
  const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");
  // In `meteor run`, client assets live in the Rspack dev server and Meteor
  // proxies them under /__rspack__/. In a build they're plain files in public/.
  const publicPath = Meteor.isDevelopment && Meteor.isRun
    ? `${remoteOrigin}/__rspack__/`
    : `${remoteOrigin}/`;

  const fromHost = (requiredVersion) => ({
    singleton: true,
    import: false, // never bundle a fallback: the host must provide it
    requiredVersion,
  });

  return [
    new MeteorFederatedExternalsPlugin(),
    new ModuleFederationPlugin({
      name: "meteor_remote",
      filename: "remoteEntry.js",
      // Meteor's client output is `commonjs2`; a browser container must not be.
      library: { type: "var", name: "meteor_remote" },
      // Only the container entry gets this public path; the app's own
      // entry keeps Meteor's "/".
      getPublicPath: `return ${JSON.stringify(publicPath)}`,
      manifest: true,
      dts: false,
      exposes: {
        "./Guestbook": "./imports/federated/guestbook/Guestbook.jsx",
      },
      shared: Object.fromEntries(
        HOST_PROVIDED.map((name) => [
          name,
          fromHost(name.startsWith("react") ? "^19.0.0" : false),
        ])
      ),
    }),
  ];
}

module.exports = { federation, HOST_PROVIDED, FEDERATED_DIR };

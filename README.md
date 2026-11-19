# Meteor + Module Federation

A Meteor 3.6 app (Rspack bundler) acting as a Module Federation **host**, loading two **remotes** at runtime:

| App | Port | Role | Exposes / consumes |
|---|---|---|---|
| `apps/meteor-host` | 3000 | Meteor host | loads `meteor_remote/Guestbook` and `remote_widgets/TaskStats` |
| `apps/meteor-remote` | 4000 | Meteor remote | exposes `./Guestbook`: a reactive Meteor component backed by **its own** server and MongoDB |
| `apps/remote-widgets` | 3030 | Rsbuild remote | exposes `./TaskStats`, rendered with the host's Meteor data passed as props |

![Host page rendering both remotes](docs/host.png)

## Run it

```bash
npm install                                   # Playwright, for the e2e suite
(cd apps/meteor-host && meteor npm install)
(cd apps/meteor-remote && meteor npm install)
npm --prefix apps/remote-widgets install

npm run dev:remote          # Rsbuild remote on :3030
npm run dev:meteor-remote   # Meteor remote on :4000 (Mongo on :4001)
npm run dev:host            # Meteor host on :3000, settings.dev.json
open http://localhost:3000

npm run test:e2e            # boots whatever isn't running, then 4 browser tests
```

Production mode: `npm run prod:remote`, then `meteor run --production --port 4000` in `apps/meteor-remote` and `meteor run --production --port 3000 --settings settings.json` in `apps/meteor-host`. The same e2e suite passes against it.

## Why this needs more than "add the plugin"

Meteor documents Module Federation as unsupported in its Rspack integration, and if you simply add `ModuleFederationPlugin` to `rspack.config.js` you can see why. The build succeeds, but:

1. **The container is `commonjs2`.** Meteor sets `output.library: commonjs2` because Meteor's module system loads the Rspack bundle. A browser can't load a commonjs2 `remoteEntry.js`.
2. **Nothing gets shared.** Meteor marks `react`, `react-dom` and `meteor/*` as externals so Meteor itself supplies them. Externals win over MF's ConsumeShared, so the manifest lists `shared: []` and the exposed chunk contains `require("react")`, which crashes on any other page.

This example fixes both, and keeps everything else on Meteor's default path.

### Meteor remote: `apps/meteor-remote/federation.config.js`

- `library: { type: "var" }` makes the container browser-loadable.
- `MeteorFederatedExternalsPlugin` scopes Meteor's externals. Modules under `imports/federated/` resolve `react*` and `meteor/*` through the MF share scope (`import: false`, so the host must provide them). The rest of the app keeps them as Meteor externals. Importing anything else from `meteor/*` in federated code is a build error that tells you to add it to `HOST_PROVIDED`.
- `getPublicPath` points only the container at the remote's origin. In `meteor run` that's `/__rspack__/` (the proxied Rspack dev server); in production builds it's `/`, served from `public/`. The app's own entry keeps Meteor's `/`.
- `server/main.js` adds CORS for `mf-manifest.json` and chunks, because the host fetches the manifest cross-origin.

The exposed `Guestbook` is an ordinary Meteor component: `useTracker`, a publication, and a method. On a host page it gets `Meteor`, `Mongo`, `DDP` and React from the host, then opens `DDP.connect(<its own origin>)`. Its data lives on the remote's server while it renders in the host's React tree. Sign the guestbook on the host and it updates live on the remote's own page.

### Meteor host: `apps/meteor-host/imports/federation/`

The host uses the MF **runtime** (`createInstance`), not the bundler plugin. React and Meteor packages are outside the Rspack bundle on purpose, so there's nothing for a build-time `shared` block to grab. `meteorShared.js` hands MF the exact objects Meteor already loaded. Remote URLs come from `Meteor.settings.public.remotes`, so each environment can point at its own deployments without a rebuild.

The e2e suite checks that `react`, `react/jsx-runtime`, `meteor/meteor` and `meteor/react-meteor-data` each have exactly one loaded copy in the share scope, and that the copy came from `meteor_host`.

## Gotchas found while testing

- **Match build modes.** A development remote bundles `react/jsx-dev-runtime`, which calls dev-only React internals. On a production host this fails with `dispatcher.getOwner is not a function`. Run dev with dev and prod with prod.
- **Port + 1 belongs to Mongo.** `meteor run --port 3000` starts MongoDB on 3001, which is why the Rsbuild remote uses 3030.
- **Console noise:** `Permissions policy violation: unload` comes from Meteor's bundled SockJS on every Meteor page, federated or not. The e2e suite ignores only that exact message from Meteor's own bundle.
- When a remote is down, MF throws `RUNTIME-003 Failed to get manifest`. `RemoteComponent` catches it in an error boundary, so the rest of the host keeps working.

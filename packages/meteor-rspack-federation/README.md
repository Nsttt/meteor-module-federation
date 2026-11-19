# meteor-rspack-federation

An Rspack plugin that makes Module Federation work inside Meteor's Rspack integration (Meteor 3.4+). The repository [README](../../README.md) explains why plain `ModuleFederationPlugin` isn't enough.

```ts
import { defineConfig } from "@meteorjs/rspack";
import { meteorFederation } from "../../packages/meteor-rspack-federation/src/index.ts";

export default defineConfig((Meteor) => ({
  plugins: [
    ...meteorFederation(Meteor, {
      name: "meteor_remote",
      origin: "http://localhost:4000",
      exposes: { "./Guestbook": "./imports/federated/guestbook/Guestbook.tsx" },
      // remotes: { other_app: "https://…/mf-manifest.json" },
    }),
  ],
}));
```

It returns `[]` for Meteor's server build. The app needs `@module-federation/enhanced` installed; the plugin resolves it from the app, so the app and the bundled runtime use the same copy.

| Option | Default | Meaning |
|---|---|---|
| `name` | — | MF container name; must be a valid JS identifier |
| `exposes` | — | Modules to expose; they must live under `federatedDir` |
| `remotes` | `{}` | `name -> manifest URL`, imported as `import("name/Module")` |
| `origin` | — | Absolute URL the remote is served from; required with `exposes` |
| `federatedDir` | `imports/federated` | Code here gets shared modules from the host |
| `shared` | `DEFAULT_SHARED` | Specifiers the host provides and federated code consumes, mapped to their required ranges |
| `settingsKey` | `"remotes"` | `Meteor.settings.public[key]` overrides `remotes` at startup; `false` disables this |

The source is erasable-syntax TypeScript, so Node loads it directly from `rspack.config.ts` without a build step.

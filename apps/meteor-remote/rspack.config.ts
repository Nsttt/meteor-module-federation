import { defineConfig } from "@meteorjs/rspack";
import { TsCheckerRspackPlugin } from "ts-checker-rspack-plugin";
import { meteorFederation } from "../../packages/meteor-rspack-federation/src/index.ts";

/**
 * meteor_remote: a Meteor app that exposes `./Guestbook`.
 *
 * `origin` is where hosts load the container from. Point it at your CDN or
 * ROOT_URL when deploying.
 */
export default defineConfig((Meteor) => ({
  module: {
    rules: [{ test: /\.svg$/i, issuer: /\.[jt]sx?$/, use: ["@svgr/webpack"] }],
  },
  plugins: [
    new TsCheckerRspackPlugin({ typescript: { tsgo: true } }),
    ...meteorFederation(Meteor, {
      name: "meteor_remote",
      origin: process.env.METEOR_REMOTE_URL ?? "http://localhost:4000",
      exposes: {
        "./Guestbook": "./imports/federated/guestbook/Guestbook.tsx",
      },
    }),
  ],
}));

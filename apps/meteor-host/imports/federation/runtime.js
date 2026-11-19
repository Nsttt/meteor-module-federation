import { Meteor } from "meteor/meteor";
import { createInstance } from "@module-federation/enhanced/runtime";
import { meteorShared } from "./meteorShared";

/**
 * The host side, done with the MF runtime instead of the bundler plugin.
 *
 * Meteor's Rspack build keeps React and `meteor/*` outside the Rspack bundle
 * (Meteor's module system owns them), so there's nothing for a build-time
 * `shared` config to share. The runtime API lets us hand MF the exact objects
 * Meteor already loaded. Remote URLs come from Meteor settings, so each
 * environment can point at its own deployments.
 */
const remotes = Object.entries(Meteor.settings.public?.remotes ?? {}).map(
  ([name, entry]) => ({ name, entry })
);

export const federation = createInstance({
  name: "meteor_host",
  remotes,
  shared: meteorShared(),
});

export async function loadFederated(id) {
  const mod = await federation.loadRemote(id);
  if (!mod) throw new Error(`Remote module ${id} resolved to nothing`);
  return mod;
}

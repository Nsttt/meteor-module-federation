/**
 * What a Meteor page puts into the Module Federation share scope.
 *
 * Meteor's client already has exactly one React and one copy of each Meteor
 * package, managed by Meteor's module system. Federated Meteor components
 * (built with `import: false`) borrow these instead of bundling their own,
 * which keeps hooks, Tracker reactivity and Meteor.connection shared.
 *
 * Keep the keys in sync with HOST_PROVIDED in the remote's federation.config.js.
 */
import { Meteor } from "meteor/meteor";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as meteor from "meteor/meteor";
import * as mongo from "meteor/mongo";
import * as ddpClient from "meteor/ddp-client";
import * as reactMeteorData from "meteor/react-meteor-data";

const meteorVersion = Meteor.release?.split("@")[1] ?? "3.0.0";

const provide = (version, lib, requiredVersion = false) => ({
  version,
  lib: () => lib,
  shareConfig: { singleton: true, requiredVersion },
});

export function meteorShared() {
  return {
    react: provide(React.version, React, "^19.0.0"),
    "react-dom": provide(ReactDOM.version, ReactDOM, "^19.0.0"),
    "react/jsx-runtime": provide(React.version, jsxRuntime),
    "react/jsx-dev-runtime": provide(React.version, jsxDevRuntime),
    "meteor/meteor": provide(meteorVersion, meteor),
    "meteor/mongo": provide(meteorVersion, mongo),
    "meteor/ddp-client": provide(meteorVersion, ddpClient),
    "meteor/react-meteor-data": provide(meteorVersion, reactMeteorData),
  };
}

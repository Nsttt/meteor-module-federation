import { createRoot } from "react-dom/client";
import { Meteor } from "meteor/meteor";
import { getInstance } from "@module-federation/enhanced/runtime";
import { meteorShared } from "/imports/federation/meteorShared";
import { App } from "/imports/ui/App";
import "/imports/ui/styles.css";

// This app is a remote, but its own page also renders the federated
// Guestbook. Those modules consume React/Meteor from the share scope, so seed
// it with this page's Meteor-provided copies first.
getInstance((instance) => instance.name === "meteor_remote")?.registerShared(meteorShared());

Meteor.startup(() => {
  const container = document.getElementById("react-target");
  const root = createRoot(container);
  root.render(<App />);
});

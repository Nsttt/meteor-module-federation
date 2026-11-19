import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { Messages } from "/imports/api/guestbook";

// Host pages on other origins fetch mf-manifest.json with fetch(), which
// needs CORS. (Script tags for remoteEntry.js and chunks don't, but allowing
// them is harmless.) Meteor's static file handler keeps headers set here.
// In `meteor run` the same files come from the Rspack dev server, which
// meteorFederation() configures for CORS.
const FEDERATION_ASSET = /^\/(mf-manifest\.json|mf-stats\.json|remoteEntry\.js|build-chunks\/)/;
WebApp.rawHandlers.use((req, res, next) => {
  if (FEDERATION_ASSET.test(req.url ?? "")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  next();
});

Meteor.startup(async () => {
  if ((await Messages.find().countAsync()) === 0) {
    await Messages.insertAsync({
      name: "meteor_remote",
      text: "Hello from the remote's own MongoDB.",
      createdAt: new Date(),
    });
  }
});

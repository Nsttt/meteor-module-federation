import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { Messages } from "/imports/api/guestbook";

// Host pages on other origins fetch mf-manifest.json with fetch(), which
// needs CORS. (Script tags for remoteEntry.js and chunks don't, but it's
// harmless to allow them too.) Meteor's static file handler keeps headers
// set here.
const FEDERATION_ASSET = /^\/(mf-manifest\.json|mf-stats\.json|remoteEntry\.js|build-chunks\/)/;
WebApp.rawConnectHandlers.use((req, res, next) => {
  if (FEDERATION_ASSET.test(req.url)) {
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

import { Meteor } from "meteor/meteor";
import { Tasks } from "/imports/api/tasks";

Meteor.publish("tasks", function () {
  return Tasks.find({}, { sort: { createdAt: 1 } });
});

Meteor.startup(async () => {
  if ((await Tasks.find().countAsync()) === 0) {
    const seed: Array<[string, boolean]> = [
      ["Run the Meteor host", true],
      ["Load a Meteor remote over Module Federation", false],
      ["Load an Rsbuild remote too", false],
    ];
    for (const [text, done] of seed) {
      await Tasks.insertAsync({ text, done, createdAt: new Date() });
    }
  }
});

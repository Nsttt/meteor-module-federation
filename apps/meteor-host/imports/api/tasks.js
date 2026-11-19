import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";

export const Tasks = new Mongo.Collection("tasks");

const text = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > 120) throw new Meteor.Error("invalid", "Task text must be 1–120 characters");
  return trimmed;
};

Meteor.methods({
  async "tasks.add"(value) {
    return Tasks.insertAsync({ text: text(value), done: false, createdAt: new Date() });
  },
  async "tasks.toggle"(id) {
    const task = await Tasks.findOneAsync(String(id));
    if (task) await Tasks.updateAsync(task._id, { $set: { done: !task.done } });
  },
  async "tasks.clearDone"() {
    return Tasks.removeAsync({ done: true });
  },
});

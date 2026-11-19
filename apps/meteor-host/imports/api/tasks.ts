import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";

export interface Task {
  _id: string;
  text: string;
  done: boolean;
  createdAt: Date;
}

export const Tasks = new Mongo.Collection<Task>("tasks");

const text = (value: unknown): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > 120) throw new Meteor.Error("invalid", "Task text must be 1–120 characters");
  return trimmed;
};

Meteor.methods({
  async "tasks.add"(value: unknown) {
    return Tasks.insertAsync({ text: text(value), done: false, createdAt: new Date() });
  },
  async "tasks.toggle"(id: unknown) {
    const task = await Tasks.findOneAsync(String(id));
    if (task) await Tasks.updateAsync(task._id, { $set: { done: !task.done } });
  },
  async "tasks.clearDone"() {
    return Tasks.removeAsync({ done: true });
  },
});

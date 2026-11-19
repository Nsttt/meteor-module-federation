import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import {
  GUESTBOOK,
  GUESTBOOK_RECENT,
  GUESTBOOK_SIGN,
  MAX_NAME,
  MAX_TEXT,
} from "/imports/federated/guestbook/constants";

export const Messages = new Mongo.Collection(GUESTBOOK);

Meteor.publish(GUESTBOOK_RECENT, function () {
  return Messages.find({}, { sort: { createdAt: -1 }, limit: 20 });
});

const clean = (value, max, field) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) throw new Meteor.Error("invalid", `${field} is required`);
  if (trimmed.length > max) throw new Meteor.Error("invalid", `${field} is too long`);
  return trimmed;
};

Meteor.methods({
  async [GUESTBOOK_SIGN]({ name, text } = {}) {
    return Messages.insertAsync({
      name: clean(name, MAX_NAME, "Name"),
      text: clean(text, MAX_TEXT, "Message"),
      createdAt: new Date(),
    });
  },
});

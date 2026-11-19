import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import { DDP } from "meteor/ddp-client";
import { GUESTBOOK, type GuestbookEntry } from "./constants";

/**
 * The guestbook's data lives on *this* app's server, wherever the component
 * ends up rendering. The container's public path tells us our origin: on our
 * own page it's "/", on a host page it's this remote's absolute URL.
 *
 * `Meteor`, `Mongo` and `DDP` come from the host's share scope, so on a host
 * page this opens a second DDP connection from the host's Meteor client back
 * to the remote's server. Cross-origin DDP is allowed by default.
 */
export const remoteOrigin = new URL(__webpack_public_path__, window.location.href).origin;

export const isOnHostPage = remoteOrigin !== window.location.origin;

export const connection: DDP.DDPStatic = isOnHostPage
  ? DDP.connect(remoteOrigin)
  : Meteor.connection;

export const Messages = new Mongo.Collection<GuestbookEntry>(GUESTBOOK, { connection });

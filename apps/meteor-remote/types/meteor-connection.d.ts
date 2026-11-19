import type { DDP } from "meteor/ddp-client";

// Meteor's client exposes its default DDP connection as Meteor.connection,
// but the generated declarations don't include it.
declare module "meteor/meteor" {
  namespace Meteor {
    const connection: DDP.DDPStatic;
  }
}

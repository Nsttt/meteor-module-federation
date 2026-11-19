// Shared by the server (imports/api) and the federated client code.
export const GUESTBOOK = "guestbook";
export const GUESTBOOK_RECENT = "guestbook.recent";
export const GUESTBOOK_SIGN = "guestbook.sign";
export const MAX_NAME = 40;
export const MAX_TEXT = 280;

export interface GuestbookEntry {
  _id?: string;
  name: string;
  text: string;
  createdAt: Date;
}

export interface SignArgs {
  name: string;
  text: string;
}

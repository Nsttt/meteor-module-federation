// Contracts for the federated modules this host imports. Remote builds have
// `dts: false`, so these are kept by hand; keep them in sync with the remotes.

declare module "meteor_remote/Guestbook" {
  import type { FC } from "react";
  const Guestbook: FC<{ title?: string }>;
  export default Guestbook;
}

declare module "remote_widgets/TaskStats" {
  import type { FC } from "react";
  export type Task = { _id: string; text: string; done: boolean };
  const TaskStats: FC<{ tasks: Task[]; onClearDone?: () => void }>;
  export default TaskStats;
}

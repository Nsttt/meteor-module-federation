import { lazy, useState, type FormEvent } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { Tasks, type Task } from "/imports/api/tasks";
import { Header } from "./Header";
import { RemoteBoundary } from "./RemoteBoundary";

// Federated modules, resolved by ModuleFederationPlugin at build time and
// loaded from the remotes at runtime.
const Guestbook = lazy(() => import("meteor_remote/Guestbook"));
const TaskStats = lazy(() => import("remote_widgets/TaskStats"));

function HostTasks({ tasks }: { tasks: Task[] }) {
  const [text, setText] = useState("");
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;
    await Meteor.callAsync("tasks.add", text);
    setText("");
  };
  return (
    <section className="host-card">
      <strong>Host tasks</strong> <small>(meteor_host's own MongoDB)</small>
      <ul className="tasks">
        {tasks.map((t) => (
          <li key={t._id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => Meteor.callAsync("tasks.toggle", t._id)} />{" "}
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="row">
        <input aria-label="New task" value={text} onChange={(e) => setText(e.target.value)} placeholder="New task" />
        <button type="submit">Add</button>
      </form>
    </section>
  );
}

export const App = () => {
  const loading = useSubscribe("tasks");
  const tasks = useTracker(() => Tasks.find({}, { sort: { createdAt: 1 } }).fetch());

  return (
    <div className="page">
      <Header />
      <main className="main federation">
        <p className="lede">
          A Meteor host composing two Module Federation remotes at runtime: another
          Meteor app (with its own server and DDP data) and a plain Rsbuild app.
        </p>

        <h2>Meteor remote → <code>meteor_remote/Guestbook</code></h2>
        <RemoteBoundary id="meteor_remote/Guestbook">
          <Guestbook title="Guestbook (served by meteor_remote)" />
        </RemoteBoundary>

        <h2>Rsbuild remote ← host data → <code>remote_widgets/TaskStats</code></h2>
        {loading() ? (
          <p>Loading tasks…</p>
        ) : (
          <div className="split">
            <HostTasks tasks={tasks} />
            <RemoteBoundary id="remote_widgets/TaskStats">
              <TaskStats tasks={tasks} onClearDone={() => Meteor.callAsync("tasks.clearDone")} />
            </RemoteBoundary>
          </div>
        )}
      </main>
    </div>
  );
};

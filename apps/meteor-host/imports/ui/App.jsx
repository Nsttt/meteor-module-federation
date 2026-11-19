import { useState } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { Tasks } from "/imports/api/tasks";
import { Header } from "./Header.jsx";
import { RemoteComponent } from "./RemoteComponent.jsx";

function HostTasks({ tasks }) {
  const [text, setText] = useState("");
  const add = async (event) => {
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
        <RemoteComponent id="meteor_remote/Guestbook" title="Guestbook (served by meteor_remote)" />

        <h2>Rsbuild remote ← host data → <code>remote_widgets/TaskStats</code></h2>
        {loading() ? (
          <p>Loading tasks…</p>
        ) : (
          <div className="split">
            <HostTasks tasks={tasks} />
            <RemoteComponent
              id="remote_widgets/TaskStats"
              tasks={tasks}
              onClearDone={() => Meteor.callAsync("tasks.clearDone")}
            />
          </div>
        )}
      </main>
    </div>
  );
};

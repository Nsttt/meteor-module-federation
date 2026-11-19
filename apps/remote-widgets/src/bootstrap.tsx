import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import TaskStats, { type Task } from './widgets/TaskStats';

// Standalone page so the remote can be developed without the Meteor host.
const seed: Task[] = [
  { _id: '1', text: 'Write the host', done: true },
  { _id: '2', text: 'Write the remote', done: false },
];

function Playground() {
  const [tasks, setTasks] = useState(seed);
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '48px auto' }}>
      <h1>remote_widgets (standalone)</h1>
      <TaskStats tasks={tasks} onClearDone={() => setTasks((t) => t.filter((x) => !x.done))} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);

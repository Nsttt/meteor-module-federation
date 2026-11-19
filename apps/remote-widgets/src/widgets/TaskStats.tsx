import { useMemo } from 'react';

export type Task = { _id: string; text: string; done: boolean };

type Props = {
  tasks: Task[];
  onClearDone?: () => void;
};

/**
 * Exposed as `remote_widgets/TaskStats`.
 *
 * It uses hooks on purpose: if the host and this remote ended up with two
 * React copies, `useMemo` would throw "Invalid hook call". Rendering cleanly
 * inside the Meteor host proves the share scope handed us the host's React.
 */
export default function TaskStats({ tasks, onClearDone }: Props) {
  const { done, total, pct } = useMemo(() => {
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  return (
    <section data-testid="remote-task-stats" style={styles.card}>
      <header style={styles.header}>
        <strong>Task stats</strong>
        <span style={styles.badge}>from remote_widgets (Rsbuild)</span>
      </header>
      <p style={styles.big}>
        {done}/{total} done · {pct}%
      </p>
      <div style={styles.track}>
        <div style={{ ...styles.bar, width: `${pct}%` }} />
      </div>
      {onClearDone && done > 0 && (
        <button type="button" onClick={onClearDone} style={styles.button}>
          Clear {done} completed
        </button>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { border: '2px dashed #7c3aed', borderRadius: 12, padding: 16, display: 'grid', gap: 8 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 12, color: '#7c3aed' },
  big: { fontSize: 24, margin: 0 },
  track: { height: 8, background: '#ede9fe', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', background: '#7c3aed', transition: 'width .2s' },
  button: { justifySelf: 'start', padding: '6px 12px', borderRadius: 6, border: '1px solid #7c3aed', background: 'white', cursor: 'pointer' },
};

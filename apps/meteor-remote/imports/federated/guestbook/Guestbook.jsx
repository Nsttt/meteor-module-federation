import { useState } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { connection, isOnHostPage, Messages, remoteOrigin } from "./connection";
import { GUESTBOOK_RECENT, GUESTBOOK_SIGN, MAX_NAME, MAX_TEXT } from "./constants";

/**
 * Exposed as `meteor_remote/Guestbook`.
 *
 * A real Meteor component: `useTracker` + a publication + a method, all
 * reactive over DDP. It renders inside the host's React tree with the host's
 * React and Meteor client (shared), while its data comes from this app.
 */
export default function Guestbook({ title = "Guestbook" }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const { ready, messages, status } = useTracker(() => {
    const handle = connection.subscribe(GUESTBOOK_RECENT);
    return {
      ready: handle.ready(),
      messages: Messages.find({}, { sort: { createdAt: -1 } }).fetch(),
      status: connection.status().status,
    };
  }, []);

  const sign = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await connection.callAsync(GUESTBOOK_SIGN, { name, text });
      setText("");
    } catch (err) {
      setError(err.reason || err.message);
    }
  };

  return (
    <section data-testid="meteor-guestbook" style={styles.card}>
      <header style={styles.header}>
        <strong>{title}</strong>
        <span style={styles.badge}>
          from meteor_remote · DDP {status} · {remoteOrigin}
          {isOnHostPage ? "" : " (own page)"}
        </span>
      </header>

      <form onSubmit={sign} style={styles.form}>
        <input
          aria-label="Your name"
          placeholder="Your name"
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
        <input
          aria-label="Message"
          placeholder="Say hi to the remote"
          value={text}
          maxLength={MAX_TEXT}
          onChange={(e) => setText(e.target.value)}
          style={{ ...styles.input, flex: 2 }}
        />
        <button type="submit" style={styles.button}>Sign</button>
      </form>
      {error && <p role="alert" style={styles.error}>{error}</p>}

      {!ready ? (
        <p style={styles.muted}>Connecting to {remoteOrigin}…</p>
      ) : messages.length === 0 ? (
        <p style={styles.muted}>No entries yet. Be the first.</p>
      ) : (
        <ul data-testid="guestbook-entries" style={styles.list}>
          {messages.map((m) => (
            <li key={m._id}>
              <b>{m.name}</b>: {m.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const accent = "#de4f4f"; // Meteor red
const styles = {
  card: { border: `2px dashed ${accent}`, borderRadius: 12, padding: 16, display: "grid", gap: 10 },
  header: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  badge: { fontSize: 12, color: accent },
  form: { display: "flex", gap: 8, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 120, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc" },
  button: { padding: "6px 12px", borderRadius: 6, border: `1px solid ${accent}`, background: accent, color: "white", cursor: "pointer" },
  error: { color: accent, margin: 0 },
  muted: { color: "#777", margin: 0 },
  list: { margin: 0, paddingLeft: 18, display: "grid", gap: 4 },
};

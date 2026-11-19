import { Component, lazy, Suspense, useMemo } from "react";
import { loadFederated } from "/imports/federation/runtime";

class RemoteBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="remote-error">
          <strong>{this.props.id} failed to load.</strong> Is that remote running?
          <pre>{String(this.state.error.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Render `default` from a federated module, e.g. "meteor_remote/Guestbook". */
export function RemoteComponent({ id, fallback = <p>Loading {id}…</p>, ...props }) {
  const Lazy = useMemo(() => lazy(() => loadFederated(id)), [id]);
  return (
    <RemoteBoundary id={id}>
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    </RemoteBoundary>
  );
}

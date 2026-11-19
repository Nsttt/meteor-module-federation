import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Shown in the error message, e.g. "meteor_remote/Guestbook". */
  id: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wrap every federated component: a remote that is down or broken shows an
 * error here instead of taking the whole host page with it.
 */
export class RemoteBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[federation] ${this.props.id} failed`, error, info.componentStack);
  }

  render() {
    const { id, children } = this.props;
    if (this.state.error) {
      return (
        <div role="alert" className="remote-error">
          <strong>{id} failed to load.</strong> Is that remote running?
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return <Suspense fallback={<p>Loading {id}…</p>}>{children}</Suspense>;
  }
}

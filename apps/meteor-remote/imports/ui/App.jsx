import { lazy, Suspense } from "react";
import { Header } from "./Header.jsx";

// Lazy: modules under imports/federated consume shared React/Meteor, which
// load asynchronously.
const Guestbook = lazy(() => import("/imports/federated/guestbook/Guestbook.jsx"));

export const App = () => (
  <div className="page">
    <Header />
    <main className="main">
      <h2>meteor_remote</h2>
      <p>
        This Meteor app exposes <code>./Guestbook</code> at{" "}
        <a href="/mf-manifest.json">mf-manifest.json</a> (production) or{" "}
        <a href="/__rspack__/mf-manifest.json">/__rspack__/mf-manifest.json</a> (meteor run).
      </p>
      <Suspense fallback={<p>Loading guestbook…</p>}>
        <Guestbook title="Guestbook (rendered on the remote's own page)" />
      </Suspense>
    </main>
  </div>
);

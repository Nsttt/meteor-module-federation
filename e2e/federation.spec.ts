import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const HOST = "http://localhost:3000";
const METEOR_REMOTE = "http://localhost:4000";

// Meteor's bundled SockJS registers an `unload` listener, which current
// Chrome reports on every Meteor page, federated or not. It's not ours.
// Dev serves it from /packages/socket-stream-client.js; production merges
// all packages into one /<sha>.js?meteor_js_resource=true bundle.
const isMeteorSockjsUnloadNoise = (msg: ConsoleMessage) => {
  if (!msg.text().startsWith("Permissions policy violation: unload")) return false;
  const { pathname, searchParams } = new URL(msg.location().url);
  return (
    pathname === "/packages/socket-stream-client.js" ||
    (/^\/[0-9a-f]{40}\.js$/.test(pathname) && searchParams.has("meteor_js_resource"))
  );
};

/** Fail the test on any page error or console error (e.g. "Invalid hook call"). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isMeteorSockjsUnloadNoise(msg)) errors.push(msg.text());
  });
  return errors;
}

test("Meteor host renders the Meteor remote's Guestbook over its own DDP connection", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HOST);

  const guestbook = page.getByTestId("meteor-guestbook");
  await expect(guestbook).toContainText("Guestbook (served by meteor_remote)");
  await expect(guestbook).toContainText(`DDP connected · ${METEOR_REMOTE}`);
  await expect(guestbook.getByTestId("guestbook-entries")).toContainText("Hello from the remote's own MongoDB.");
  expect(errors).toEqual([]);
});

test("signing on the host writes to the remote's server and shows up live on the remote's own page", async ({ browser }) => {
  const host = await browser.newPage();
  const remote = await browser.newPage();
  const errors = [host, remote].map(collectErrors);

  await remote.goto(METEOR_REMOTE);
  await expect(remote.getByTestId("meteor-guestbook")).toContainText("(own page)");

  await host.goto(HOST);
  const guestbook = host.getByTestId("meteor-guestbook");
  await expect(guestbook).toContainText("DDP connected");

  const message = `hi from the host ${Date.now()}`;
  await guestbook.getByLabel("Your name").fill("meteor_host");
  await guestbook.getByLabel("Message").fill(message);
  await guestbook.getByRole("button", { name: "Sign" }).click();

  // Same publication, two pages, two origins: both update reactively.
  await expect(guestbook.getByTestId("guestbook-entries")).toContainText(message);
  await expect(remote.getByTestId("guestbook-entries")).toContainText(message);

  // Server-side validation travels back through the federated component.
  await guestbook.getByLabel("Message").fill("   ");
  await guestbook.getByRole("button", { name: "Sign" }).click();
  await expect(guestbook.getByRole("alert")).toHaveText("Message is required");

  expect(errors.flat()).toEqual([]);
});

test("Rsbuild remote renders host Meteor data with the host's React", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(HOST);

  const stats = page.getByTestId("remote-task-stats");
  await expect(stats).toContainText("from remote_widgets (Rsbuild)");
  const before = await stats.locator("p").first().innerText();

  // Toggle a host task: Meteor reactivity -> host props -> remote re-render.
  await page.getByRole("checkbox").first().click();
  await expect(stats.locator("p").first()).not.toHaveText(before);
  expect(errors).toEqual([]);
});

test("Meteor.settings overrides the build-time remote URLs", async ({ page }) => {
  // rspack.config.ts defaults remote_widgets to localhost:3030/mf-manifest.json;
  // settings*.json add ?from=settings, so only the override fetches that URL.
  const manifestRequests: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.port === "3030" && url.pathname === "/mf-manifest.json") manifestRequests.push(url.search);
  });
  await page.goto(HOST);
  await expect(page.getByTestId("remote-task-stats")).toBeVisible();
  expect(manifestRequests).toEqual(["?from=settings"]);
});

test("both remotes resolved React and Meteor from the host's share scope", async ({ page }) => {
  await page.goto(HOST);
  await expect(page.getByTestId("meteor-guestbook")).toBeVisible();
  await expect(page.getByTestId("remote-task-stats")).toBeVisible();

  const providers = await page.evaluate(() => {
    type Shared = { from: string; loaded?: boolean; lib?: unknown };
    type Instance = { name: string; shareScopeMap: Record<string, Record<string, Record<string, Shared>>> };
    const federation = (globalThis as unknown as { __FEDERATION__: { __INSTANCES__: Instance[] } }).__FEDERATION__;
    const host = federation.__INSTANCES__.find((i) => i.name === "meteor_host")!;
    const scope = host.shareScopeMap.default;
    const pick = (name: string) =>
      Object.values(scope[name] ?? {})
        .filter((s) => s.loaded || s.lib)
        .map((s) => s.from);
    return {
      react: pick("react"),
      jsxRuntime: pick("react/jsx-runtime"),
      meteor: pick("meteor/meteor"),
      tracker: pick("meteor/react-meteor-data"),
    };
  });
  // One loaded copy of each, and it is the host's.
  expect(providers).toEqual({
    react: ["meteor_host"],
    jsxRuntime: ["meteor_host"],
    meteor: ["meteor_host"],
    tracker: ["meteor_host"],
  });
});

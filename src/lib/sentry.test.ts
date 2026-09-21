import { describe, expect, it } from "vitest";
import { redactSentryEvent, shouldInitSentry } from "./sentry";

describe("shouldInitSentry", () => {
  it("no-op sem DSN", () => {
    expect(shouldInitSentry("", "production")).toBe(false);
    expect(shouldInitSentry(undefined, "production")).toBe(false);
  });

  it("no-op em MODE=test mesmo com DSN", () => {
    expect(shouldInitSentry("https://key@glitchtip.example/1", "test")).toBe(false);
  });

  it("sobe com DSN fora de test", () => {
    expect(shouldInitSentry("https://key@glitchtip.example/1", "production")).toBe(true);
  });
});

describe("redactSentryEvent", () => {
  it("remove Authorization e Cookie", () => {
    const ev = redactSentryEvent({
      request: {
        headers: {
          Authorization: "Bearer secret",
          Cookie: "sid=1",
          Accept: "text/html",
        },
      },
    });
    expect(ev.request?.headers?.Authorization).toBeUndefined();
    expect(ev.request?.headers?.Cookie).toBeUndefined();
    expect(ev.request?.headers?.Accept).toBe("text/html");
  });
});

import * as Sentry from "@sentry/react";

export type SentryLikeEvent = {
  request?: { headers?: Record<string, string> };
};

/** Sem DSN o SDK não sobe. MODE=test também não — senão a suíte vaza evento. */
export function shouldInitSentry(dsn: unknown, mode: string): dsn is string {
  return typeof dsn === "string" && dsn.length > 0 && mode !== "test";
}

export function redactSentryEvent<T extends SentryLikeEvent>(event: T): T {
  if (event.request?.headers) {
    delete event.request.headers["Authorization"];
    delete event.request.headers["Cookie"];
  }
  return event;
}

const dsn =
  import.meta.env.VITE_GLITCHTIP_DSN ||
  import.meta.env.VITE_SENTRY_DSN;

export function initSentry(): void {
  if (!shouldInitSentry(dsn, import.meta.env.MODE)) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0.01,
    autoSessionTracking: false,
    sendClientReports: false,
    ignoreErrors: [
      "ResizeObserver loop",
      "ResizeObserver loop limit exceeded",
    ],
    beforeSend(event) {
      return redactSentryEvent(event);
    },
  });
}

export { Sentry };

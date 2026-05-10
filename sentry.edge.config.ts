import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  beforeSend(event) {
    delete event.extra;
    delete event.user;
    if (event.request) {
      delete event.request.data;
      delete event.request.headers;
      delete event.request.cookies;
      delete event.request.query_string;
      delete event.request.url;
    }
    if (event.contexts) {
      delete event.contexts.runtime;
      delete event.contexts.device;
      delete event.contexts.os;
    }
    return event;
  },
});

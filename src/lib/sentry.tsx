import * as Sentry from '@sentry/react-native';

import { appEnv } from './env';

export function initializeSentry(): void {
  if (!appEnv.sentryDsn) return;
  Sentry.init({
    dsn: appEnv.sentryDsn,
    enabled: !__DEV__,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      if (event.request) delete event.request.data;
      return event;
    },
  });
}


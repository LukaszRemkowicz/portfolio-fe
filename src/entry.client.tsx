import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { HydratedRouter } from 'react-router/dom';
import i18n, { i18nReady } from './i18n.client';
import { setLanguageGetter } from './api/api';
import { initClientServices } from './utils/initClientServices';
import { getEnv } from './utils/env';
import { initPwaRuntime } from './utils/pwaRuntime';

// Wire language getter so axios interceptor reads live i18n language
setLanguageGetter(() => i18n.language || 'en');

async function bootstrapApp() {
  await i18nReady;

  // Initialise browser-only services (Sentry lazy-load)
  initClientServices();
  initPwaRuntime(getEnv('ENVIRONMENT', getEnv('NODE_ENV', 'development')));

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18n}>
        <HydratedRouter />
      </I18nextProvider>
    );
  });
}

void bootstrapApp();

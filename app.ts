import { createApp, createRouter } from '@agentuity/runtime';

import api from './src/api';

const home = createRouter();

home.get('/', (c) => c.redirect('/workbench'));

const app = await createApp({
  router: [
    {
      path: '/',
      router: home,
    },
    {
      path: '/api',
      router: api,
    },
  ],
  workbench: {
    route: '/workbench',
    headers: {},
  },
});

app.logger.debug('Running %s', app.server.url);

export default app;

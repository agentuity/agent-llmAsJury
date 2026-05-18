import { createRouter } from '@agentuity/runtime';

import contentJury from '../agent/content-jury';
import jury from '../agent/jury';

const api = createRouter();

api.post('/jury', jury.validator(), async (c) => {
  const data = c.req.valid('json');
  return c.json(await jury.run(data));
});

api.post('/content-jury', contentJury.validator(), async (c) => {
  const data = c.req.valid('json');
  return c.json(await contentJury.run(data));
});

export default api;

import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../server/apiRouter.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleApiRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
}

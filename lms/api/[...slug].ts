// @ts-nocheck
import { IncomingMessage, ServerResponse } from 'http';
import app from '../backend/src/app';

const handler = (req: IncomingMessage, res: ServerResponse) => {
  app(req, res);
};

export default handler;

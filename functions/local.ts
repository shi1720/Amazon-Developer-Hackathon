import express from 'express';
import { handle } from './handler';
import { resolve } from 'node:path';
const server = express();
server.use(express.raw({ type: () => true, limit: '32kb' }));
server.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/mcp') {
    void handle(
      Object.assign(req, {
        rawBody: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
      }),
      res,
    );
  } else next();
});
server.use(express.static(resolve('dist/client')));
server.use((_, res) => res.sendFile(resolve('dist/client/index.html')));
const port = Number(process.env.PORT || 3002);
server.listen(port, '127.0.0.1', () =>
  console.log(`KindHandoff backend ready on http://127.0.0.1:${port}`),
);

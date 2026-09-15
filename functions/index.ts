import { onRequest } from 'firebase-functions/v2/https';
import { handle } from './handler';
export const api = onRequest(
  {
    region: 'us-central1',
    serviceAccount: 'kindhandoff-runtime@kindhandoff.iam.gserviceaccount.com',
    memory: '256MiB',
    cpu: 1,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 40,
    timeoutSeconds: 30,
    cors: false,
    invoker: 'public',
  },
  handle,
);

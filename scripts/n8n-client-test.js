import test from 'node:test';
import assert from 'node:assert/strict';
import { isN8nAvailable } from './lib/n8n-client.js';

test('n8n-client: isN8nAvailable returns boolean', async () => {
  const available = await isN8nAvailable();
  assert.equal(typeof available, 'boolean');
});

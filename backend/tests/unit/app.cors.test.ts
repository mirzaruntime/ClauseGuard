import request from 'supertest';
import { createApp } from '../../src/app';

describe('CORS middleware', () => {
  it('does not allow credentials when wildcard origins are enabled', async () => {
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://client.example');

    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

import { databaseSsl } from './database-ssl.js';

describe('database TLS', () => {
  it('keeps local MySQL unchanged', () => {
    expect(databaseSsl({})).toBeUndefined();
    expect(databaseSsl({ DB_SSL: 'false' })).toBeUndefined();
  });
  it('verifies cloud certificates', () => {
    expect(databaseSsl({ DB_SSL: 'true' })).toEqual({ rejectUnauthorized: true });
  });
  it('accepts escaped PEM newlines', () => {
    expect(databaseSsl({ DB_SSL: 'true', DB_SSL_CA: 'BEGIN\\ncertificate\\nEND' }))
      .toEqual({ rejectUnauthorized: true, ca: 'BEGIN\ncertificate\nEND' });
  });
});
/** Shared by API and database scripts. Keep certificate verification enabled. */
export function databaseSsl(env: NodeJS.ProcessEnv = process.env): { rejectUnauthorized: true; ca?: string } | undefined {
  if (env.DB_SSL !== 'true') return undefined;
  const ca = env.DB_SSL_CA?.replace(/\\n/g, '\n');
  return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
}
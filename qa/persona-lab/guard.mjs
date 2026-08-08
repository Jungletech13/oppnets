const productionHosts = new Set(['oppnets.com', 'www.oppnets.com', 'oppnets.pages.dev']);
const productionProjectRefs = new Set(['piodsfehlkyfzofcdacy']);

export function assertIsolatedEnvironment(env = process.env) {
  const appUrl = env.OPPNETS_QA_APP_URL;
  const supabaseUrl = env.OPPNETS_QA_SUPABASE_URL;
  const runId = env.OPPNETS_QA_RUN_ID;
  if (!appUrl || !supabaseUrl || !runId) {
    throw new Error('QA_ABORT: OPPNETS_QA_APP_URL, OPPNETS_QA_SUPABASE_URL, and OPPNETS_QA_RUN_ID are required.');
  }

  const app = new URL(appUrl);
  const database = new URL(supabaseUrl);
  const projectRef = database.hostname.split('.')[0];
  if (app.protocol !== 'http:' && app.protocol !== 'https:') throw new Error('QA_ABORT: unsupported app URL protocol.');
  const databaseIsLoopback = new Set(['127.0.0.1', 'localhost', '::1']).has(database.hostname.toLowerCase());
  if (database.protocol !== 'https:' && !(databaseIsLoopback && database.protocol === 'http:')) {
    throw new Error('QA_ABORT: QA Supabase URL must use HTTPS unless it is a loopback-only local service.');
  }
  if (productionHosts.has(app.hostname.toLowerCase())) throw new Error(`QA_ABORT: production app host rejected (${app.hostname}).`);
  if (productionProjectRefs.has(projectRef.toLowerCase())) throw new Error(`QA_ABORT: production Supabase project rejected (${projectRef}).`);
  if (!/^[a-z0-9][a-z0-9_-]{5,63}$/i.test(runId)) throw new Error('QA_ABORT: invalid QA run id.');
  if (env.OPPNETS_QA_SYNTHETIC_ONLY !== 'true') throw new Error('QA_ABORT: OPPNETS_QA_SYNTHETIC_ONLY must equal true.');

  return { appUrl: app.href, supabaseUrl: database.href, projectRef, runId };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  try {
    console.log(JSON.stringify(assertIsolatedEnvironment(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

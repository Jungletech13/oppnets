import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertIsolatedEnvironment } from './guard.mjs';
import { personas } from './personas.mjs';
import { scenarios } from './scenarios.mjs';
import { assignments, pilotPersonaIds, pilotAssignments } from './assignments.mjs';

const environment = assertIsolatedEnvironment();
const scope = process.env.OPPNETS_QA_SCOPE === 'full' ? 'full' : 'pilot';
const selectedPersonaIds = scope === 'full' ? personas.map((persona) => persona.persona_id) : pilotPersonaIds;
const selectedAssignments = scope === 'full' ? assignments : pilotAssignments;
const outputDir = new URL('./results/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const routeByScenario = {
  S01: 'landing', S02: 'profile', S03: 'landing', S04: 'discover', S05: 'discover',
  S06: 'create-opportunity', S07: 'people', S08: 'profile', S09: 'my-opportunities',
  S10: 'home', S11: 'home', S12: 'home', S13: 'messages', S14: 'notifications',
  S15: 'trust', S16: 'professionals', S17: 'companies', S18: 'resources',
  S19: 'pricing', S20: 'settings', S21: 'home', S22: 'home', S23: 'profile', S24: 'home',
};

const expectedText = {
  landing: /Every connection|Opportunity Network/i,
  home: /Welcome back|Home|workspace/i,
  profile: /Profile|About|Edit profile/i,
  discover: /Discover Opportunities/i,
  people: /People and Teams/i,
  'my-opportunities': /My Opportunities/i,
  'create-opportunity': /New Opportunity|Create (an )?Opportunity/i,
  messages: /Messages/i,
  notifications: /Notifications/i,
  trust: /Trust Center/i,
  professionals: /Professionals/i,
  companies: /Companies/i,
  resources: /Resource Center/i,
  pricing: /Pricing/i,
  settings: /Settings/i,
};

function viewportFor(value) {
  const [width, height] = value.split('x').map(Number);
  return { width, height };
}

async function authenticate(page, persona) {
  await page.goto(environment.appUrl, { waitUntil: 'domcontentloaded' });
  const signInEmail = page.locator('input[type="email"]');
  await signInEmail.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (!(await signInEmail.isVisible().catch(() => false))) {
    const currentBody = await page.locator('body').innerText();
    if (currentBody.includes('We could not load your workspace')) {
      throw new Error(`Workspace data load failed before authentication: ${currentBody.split('\n').filter(Boolean).slice(0, 3).join(' — ')}`);
    }
    return { mode: 'existing-session' };
  }

  const password = `Synthetic-${persona.persona_id}-A1!`;
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  await page.locator('input[type="email"]').fill(persona.test_email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Create Account/i }).click();
  await page.waitForTimeout(350);

  if (await page.locator('input[type="email"]').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
    await page.locator('input[type="email"]').fill(persona.test_email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /^Sign In/i }).last().click();
  }

  await page.waitForFunction(() => !document.body.innerText.includes('Create Account'), null, { timeout: 10000 });
  await page.waitForTimeout(500);
  const postAuthBody = await page.locator('body').innerText();
  if (postAuthBody.includes('We could not load your workspace')) {
    const detail = postAuthBody.split('\n').filter(Boolean).slice(0, 3).join(' — ');
    throw new Error(`Workspace data load failed after authentication: ${detail}`);
  }
  return { mode: 'synthetic-local-account' };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const run = {
  run_id: environment.runId,
  scope,
  synthetic: true,
  app_url: environment.appUrl,
  started_at: new Date().toISOString(),
  personas: [],
  summary: {},
};

try {
  for (const personaId of selectedPersonaIds) {
    const persona = personas.find((candidate) => candidate.persona_id === personaId);
    const context = await browser.newContext({ viewport: viewportFor(persona.viewport), reducedMotion: persona.accessibility_mode === 'reduced-motion user' ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    const httpErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }));
    page.on('response', (response) => {
      const expectedExistingSyntheticAccount = response.status() === 422 && response.url().startsWith(`${environment.supabaseUrl}auth/v1/signup`);
      if (!expectedExistingSyntheticAccount && response.status() >= 400 && (response.url().startsWith(environment.appUrl) || response.url().startsWith(environment.supabaseUrl))) {
        httpErrors.push({ url: response.url(), status: response.status(), status_text: response.statusText() });
      }
    });

    const personaResult = { persona_id: personaId, cohort: persona.cohort, viewport: persona.viewport, scenarios: [], positive_feedback: [], negative_feedback: [], defects: [] };
    try {
      personaResult.authentication = await authenticate(page, persona);
      const assigned = selectedAssignments.filter((assignment) => assignment.persona_id === personaId);
      for (const assignment of assigned) {
        const scenario = scenarios.find((candidate) => candidate.scenario_id === assignment.scenario_id);
        const route = routeByScenario[scenario.scenario_id];
        const url = new URL(environment.appUrl);
        url.hash = `/${route}`;
        const started = Date.now();
        await page.goto(url.href, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !['Loading...', 'Loading your OppNets workspace...'].includes(document.body.innerText.trim()), null, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(100);
        const beforeRefresh = page.url();
        const body = await page.locator('body').innerText();
        const headingFound = expectedText[route]?.test(body) ?? body.length > 0;
        const authRegression = /Create Account/.test(body);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !['Loading...', 'Loading your OppNets workspace...'].includes(document.body.innerText.trim()), null, { timeout: 10000 }).catch(() => {});
        const routePersisted = page.url().includes(`#/${route}`);
        const passed = headingFound && !authRegression && routePersisted && !overflow;
        personaResult.scenarios.push({ scenario_id: scenario.scenario_id, name: scenario.name, route, passed, duration_ms: Date.now() - started, checks: { heading_found: headingFound, authenticated_after_navigation: !authRegression, route_persisted_after_refresh: routePersisted, horizontal_overflow: overflow }, before_refresh_url: beforeRefresh });
        if (passed) personaResult.positive_feedback.push(`${scenario.scenario_id}: expected content and route persistence were clear.`);
        if (!passed) {
          const failures = [];
          if (!headingFound) failures.push('expected page heading/content was missing');
          if (authRegression) failures.push('navigation returned to authentication');
          if (!routePersisted) failures.push('route did not persist after refresh');
          if (overflow) failures.push('horizontal overflow detected');
          personaResult.negative_feedback.push(`${scenario.scenario_id}: ${failures.join('; ')}.`);
          personaResult.defects.push({ priority: authRegression || !routePersisted ? 'P1' : 'P2', scenario_id: scenario.scenario_id, reproduction: [`Authenticate as ${personaId}`, `Navigate to #/${route}`, 'Refresh the page'], expected: `Remain authenticated on #/${route} with expected content and no horizontal overflow`, actual: failures.join('; ') });
        }
      }
    } catch (error) {
      if (error.message.includes('after authentication')) {
        personaResult.positive_feedback.push('Synthetic local authentication completed and reached workspace bootstrap.');
      }
      personaResult.defects.push({ priority: 'P1', scenario_id: 'pilot-setup', reproduction: [`Run pilot for ${personaId}`], expected: 'Synthetic local account authenticates and scenarios execute', actual: error.message });
      personaResult.negative_feedback.push(`Pilot blocked: ${error.message}`);
    }
    personaResult.console_errors = [...new Set(consoleErrors)];
    personaResult.failed_requests = failedRequests.filter((item) => !item.url.startsWith('data:'));
    personaResult.http_errors = [...new Map(httpErrors.map((item) => [`${item.status}:${item.url}`, item])).values()];
    const actionableConsoleErrors = personaResult.console_errors.filter((message) => !message.startsWith('Failed to load resource:'));
    if (actionableConsoleErrors.length && personaResult.scenarios.length > 0) personaResult.defects.push({ priority: 'P2', scenario_id: 'console', reproduction: [`Run assigned scenarios for ${personaId}`], expected: 'No unhandled browser console errors', actual: actionableConsoleErrors.join(' | ') });
    if (personaResult.http_errors.length && personaResult.scenarios.length > 0) personaResult.defects.push({ priority: 'P2', scenario_id: 'http', reproduction: [`Run assigned scenarios for ${personaId}`], expected: 'No local application or Supabase HTTP errors', actual: personaResult.http_errors.map((item) => `${item.status} ${item.url}`).join(' | ') });
    run.personas.push(personaResult);
    await context.close();
  }
} finally {
  await browser.close();
}

const allScenarioResults = run.personas.flatMap((persona) => persona.scenarios);
const allDefects = run.personas.flatMap((persona) => persona.defects);
run.finished_at = new Date().toISOString();
run.summary = {
  tested_personas: run.personas.length,
  scenarios_attempted: allScenarioResults.length,
  scenarios_passed: allScenarioResults.filter((result) => result.passed).length,
  scenarios_failed: allScenarioResults.filter((result) => !result.passed).length,
  persona_setup_blocks: run.personas.filter((persona) => persona.scenarios.length === 0).length,
  defects: allDefects.length,
  p1_defects: allDefects.filter((defect) => defect.priority === 'P1').length,
  p2_defects: allDefects.filter((defect) => defect.priority === 'P2').length,
  positive_feedback_items: run.personas.reduce((sum, persona) => sum + persona.positive_feedback.length, 0),
  negative_feedback_items: run.personas.reduce((sum, persona) => sum + persona.negative_feedback.length, 0),
};

const resultUrl = new URL(`pilot-${environment.runId}.json`, outputDir);
await writeFile(resultUrl, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...run.summary, result_file: resultUrl.pathname }, null, 2));
if (run.summary.persona_setup_blocks > 0 || run.summary.p1_defects > 0) process.exitCode = 1;

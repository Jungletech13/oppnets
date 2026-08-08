import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { assertIsolatedEnvironment } from './guard.mjs';

const environment = assertIsolatedEnvironment();
const raw = await readFile(new URL('../../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(raw.split(/\r?\n/).filter((x) => x && !x.startsWith('#')).map((x) => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]));
if (env.VITE_SUPABASE_URL !== environment.supabaseUrl.replace(/\/$/, '')) throw new Error('QA_ABORT: local app and guarded database do not match.');
const adminless = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const actor = (role) => ({ role, email: `${role}-${environment.runId}@example.test`, password: `Synthetic-${role}-A1!` });
const creator = actor('creator'); const collaborator = actor('collaborator');
async function ensure(a) { const s = await adminless.auth.signUp({ email: a.email, password: a.password }); if (s.data.user) { await adminless.auth.signOut(); return s.data.user.id; } const i = await adminless.auth.signInWithPassword({ email: a.email, password: a.password }); if (i.error) throw i.error; await adminless.auth.signOut(); return i.data.user.id; }
const creatorId = await ensure(creator); const collaboratorId = await ensure(collaborator);
async function login(page, a) { await page.goto(environment.appUrl); await page.locator('input[type=email]').waitFor({ timeout: 10000 }); await page.getByRole('button', { name: 'Sign In', exact: true }).first().click(); await page.locator('input[type=email]').fill(a.email); await page.locator('input[type=password]').fill(a.password); await page.getByRole('button', { name: /^Sign In/i }).last().click(); await page.waitForFunction(() => !document.body.innerText.includes('Create Account'), null, { timeout: 15000 }); await page.waitForTimeout(500); }
const title = `Synthetic venture ${environment.runId}`; const task = `Synthetic evidence task ${environment.runId}`;
const result = { run_id: environment.runId, local_only: true, personas: [{ role: creator.role, id: creatorId }, { role: collaborator.role, id: collaboratorId }], checks: {}, positive_feedback: [], negative_feedback: [], improvement_suggestions: [], defects: [], limitations: [], started_at: new Date().toISOString() };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const cc = await browser.newContext(); const cp = await cc.newPage(); await login(cp, creator);
  await cp.goto(`${environment.appUrl}#/create-opportunity`);
  await cp.getByPlaceholder(/House-flipping partnership/).fill(title); await cp.getByPlaceholder(/Describe the opportunity/).fill('A local-only synthetic venture used to verify safe collaboration workflows.');
  await cp.getByRole('button', { name: /Continue/ }).click(); await cp.getByPlaceholder('City, State').fill('Test City, NY'); await cp.getByPlaceholder(/Renovate and sell/).fill('Validate the collaboration workflow end to end');
  await cp.getByRole('button', { name: /Continue/ }).click(); await cp.getByPlaceholder(/Role title/).fill('Synthetic collaborator'); await cp.getByRole('button', { name: /Continue/ }).click(); await cp.getByRole('button', { name: /Continue/ }).click(); await cp.getByRole('button', { name: /^Publish/ }).click(); await cp.waitForTimeout(800);
  result.checks.creator_sees_published_opportunity = await cp.getByText(title, { exact: true }).first().isVisible().catch(() => false);
  await cp.reload(); await cp.waitForTimeout(500); result.checks.opportunity_survives_creator_refresh = await cp.getByText(title, { exact: true }).first().isVisible().catch(() => false);
  const { data: auth } = await adminless.auth.signInWithPassword({ email: creator.email, password: creator.password });
  const { data: oppRows } = await adminless.from('opportunities').select('id,title').eq('owner_id', auth.user.id).eq('title', title); const opportunityId = oppRows?.[0]?.id; await adminless.auth.signOut();
  result.checks.opportunity_persisted = Boolean(opportunityId); await cc.close();

  const uc = await browser.newContext(); const up = await uc.newPage(); await login(up, collaborator); await up.goto(`${environment.appUrl}#/opportunity?opportunityId=${opportunityId}`); await up.getByRole('button', { name: /Start Collaboration/ }).click();
  result.limitations.push('The current MVP skips an owner application/approval step and lets a viewer create a collaboration space immediately.');
  await up.getByRole('button', { name: /Create Collaboration Space/ }).click(); await up.waitForTimeout(1200);
  const openSpace = up.getByRole('button', { name: /Open Space/ });
  if (!(await openSpace.isVisible().catch(() => false))) {
    const alert = await up.getByRole('alert').textContent().catch(() => null);
    throw new Error(`Collaboration space creation failed: ${alert || (await up.locator('body').innerText()).slice(-500)}`);
  }
  await openSpace.click(); await up.waitForTimeout(700);
  result.checks.collaborator_created_space = await up.getByText(title, { exact: true }).first().isVisible().catch(() => false); const spaceUrl = up.url(); await up.reload(); await up.waitForTimeout(500); result.checks.space_survives_collaborator_refresh = await up.getByText(title, { exact: true }).first().isVisible().catch(() => false);
  await up.getByRole('button', { name: /^tasks/i }).click(); await up.getByRole('button', { name: /New task/ }).first().click(); const modal = up.getByRole('dialog'); await modal.getByLabel('Task title').fill(task).catch(async()=>modal.locator('input').first().fill(task)); await modal.getByPlaceholder('Checklist item').fill('Attach synthetic evidence'); await modal.getByRole('button', { name: /Create task/ }).click(); await up.waitForTimeout(600);
  result.checks.task_created = await up.getByText(task, { exact: true }).first().isVisible().catch(() => false); await up.reload(); await up.waitForTimeout(500); await up.getByRole('button', { name: /^tasks/i }).click(); result.checks.task_survives_refresh = await up.getByText(task, { exact: true }).first().isVisible().catch(() => false);
  await up.goto(`${environment.appUrl}#/profile?profileId=${creatorId}`); await up.locator('button.text-red-600').click(); const reportText = `Synthetic factual report ${environment.runId}`; await up.getByPlaceholder(/Describe the concern factually/).fill(reportText); await up.getByRole('button', { name: /Submit report/ }).click(); await up.goto(`${environment.appUrl}#/trust`); result.checks.report_visible_in_trust_center = await up.getByText(reportText, { exact: true }).isVisible().catch(() => false);
  await up.getByRole('button', { name: /Submit appeal/ }).click(); await up.getByPlaceholder(/Describe the decision/).fill('Synthetic moderation decision'); await up.getByPlaceholder(/Provide factual context/).fill('Synthetic factual context for local appeal verification.'); await up.getByRole('button', { name: /^Submit$/ }).click(); await up.waitForTimeout(500); result.checks.appeal_status_visible = await up.getByText(/Appeal status:/).isVisible().catch(() => false); await uc.close();

  const ownerContext = await browser.newContext(); const ownerPage = await ownerContext.newPage(); await login(ownerPage, creator); await ownerPage.goto(spaceUrl); result.checks.owner_can_open_shared_space = await ownerPage.getByText(title, { exact: true }).first().isVisible().catch(() => false); await ownerPage.getByRole('button', { name: /^tasks/i }).click(); result.checks.owner_sees_shared_task = await ownerPage.getByText(task, { exact: true }).first().isVisible().catch(() => false); await ownerContext.close();
} catch (error) { result.execution_error = error instanceof Error ? error.message : String(error); }
finally { await browser.close(); }
for (const [name, passed] of Object.entries(result.checks)) { (passed ? result.positive_feedback : result.negative_feedback).push({ check: name, evidence: passed ? 'Visible in isolated browser or authenticated database session.' : 'Expected persisted state was not visible.' }); }
if (result.execution_error) result.defects.push({ severity: 'P1', title: 'Stateful workflow execution stopped', evidence: result.execution_error });
for (const [name, passed] of Object.entries(result.checks)) if (!passed) result.defects.push({ severity: name.includes('refresh') || name.includes('persist') || name.includes('shared') ? 'P1' : 'P2', title: name.replaceAll('_', ' '), evidence: 'Expected local persisted state was not visible.' });
result.improvement_suggestions.push({ priority: 'High', suggestion: 'Replace immediate collaboration-space creation with an explicit application, owner review, accept/decline, and notification workflow.' }, { priority: 'High', suggestion: 'Add visible save confirmations and recovery guidance to every mutation.' }, { priority: 'Medium', suggestion: 'Expose a workflow history showing actor, timestamp, review state, and evidence status.' });
result.passed = !result.execution_error && result.defects.length === 0; result.finished_at = new Date().toISOString();
const dir = new URL('./results/', import.meta.url); await mkdir(dir, { recursive: true }); const out = new URL(`stateful-${environment.runId}.json`, dir); await writeFile(out, JSON.stringify(result, null, 2)); console.log(JSON.stringify({ report: out.pathname, passed: result.passed, checks: result.checks, defects: result.defects, limitations: result.limitations }, null, 2)); if (!result.passed) process.exitCode = 1;

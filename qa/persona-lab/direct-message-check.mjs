import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { assertIsolatedEnvironment } from './guard.mjs';

const environment = assertIsolatedEnvironment();
const envText = await readFile(new URL('../../.env.local', import.meta.url), 'utf8');
const values = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
if (values.VITE_SUPABASE_URL !== environment.supabaseUrl.replace(/\/$/, '')) throw new Error('QA_ABORT: app configuration is not using the guarded local Supabase URL.');

const sender = { persona_id: 'direct-sender', test_email: `direct-sender-${environment.runId}@example.test` };
const recipient = { persona_id: 'direct-recipient', test_email: `direct-recipient-${environment.runId}@example.test` };
const passwordFor = (persona) => `Synthetic-${persona.persona_id}-A1!`;
const supabase = createClient(values.VITE_SUPABASE_URL, values.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
async function ensureAccount(persona) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: persona.test_email, password: passwordFor(persona) });
  if (!signUpError && signUpData.user) {
    await supabase.auth.signOut();
    return signUpData.user.id;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: persona.test_email, password: passwordFor(persona) });
  if (error || !data.user) throw error ?? new Error(`Identity unavailable for ${persona.persona_id}.`);
  await supabase.auth.signOut();
  return data.user.id;
}
await ensureAccount(sender);
const recipientId = await ensureAccount(recipient);

async function signIn(page, persona) {
  await page.goto(environment.appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.locator('input[type="email"]').fill(persona.test_email);
  await page.locator('input[type="password"]').fill(passwordFor(persona));
  await page.getByRole('button', { name: /^Sign In/i }).last().click();
  await page.waitForFunction(() => !document.body.innerText.includes('Create Account'), null, { timeout: 15000 });
  await page.waitForTimeout(750);
}

const message = `Synthetic cross-user verification ${environment.runId}`;
const report = { run_id: environment.runId, app_url: environment.appUrl, supabase_url: environment.supabaseUrl, sender: sender.persona_id, recipient: recipient.persona_id, message, checks: {}, defects: [], started_at: new Date().toISOString() };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const senderContext = await browser.newContext();
  const senderPage = await senderContext.newPage();
  await signIn(senderPage, sender);
  await senderPage.goto(`${environment.appUrl}#/profile?profileId=${recipientId}`, { waitUntil: 'domcontentloaded' });
  await senderPage.getByRole('button', { name: 'Message', exact: true }).click();
  await senderPage.getByPlaceholder('Introduce yourself and your opportunity...').fill(message);
  await senderPage.getByRole('button', { name: 'Send', exact: true }).click();
  await senderPage.waitForTimeout(700);
  await senderPage.goto(`${environment.appUrl}#/messages`, { waitUntil: 'domcontentloaded' });
  report.checks.sender_sees_message_before_refresh = await senderPage.getByText(message, { exact: true }).first().isVisible().catch(() => false);
  report.sender_messages_before_refresh = (await senderPage.locator('body').innerText()).slice(0, 1500);
  await senderPage.reload({ waitUntil: 'domcontentloaded' });
  await senderPage.waitForTimeout(700);
  report.checks.sender_sees_message_after_refresh = await senderPage.getByText(message, { exact: true }).first().isVisible().catch(() => false);
  report.sender_messages_after_refresh = (await senderPage.locator('body').innerText()).slice(0, 1500);
  await senderContext.close();

  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();
  await signIn(recipientPage, recipient);
  await recipientPage.goto(`${environment.appUrl}#/notifications`, { waitUntil: 'domcontentloaded' });
  report.checks.recipient_sees_notification = await recipientPage.getByText(/sent you a message/i).isVisible().catch(() => false);
  await recipientPage.goto(`${environment.appUrl}#/messages`, { waitUntil: 'domcontentloaded' });
  report.checks.recipient_sees_message = await recipientPage.getByText(message, { exact: true }).first().isVisible().catch(() => false);
  report.recipient_messages_before_refresh = (await recipientPage.locator('body').innerText()).slice(0, 1500);
  await recipientPage.reload({ waitUntil: 'domcontentloaded' });
  await recipientPage.waitForTimeout(700);
  report.checks.recipient_sees_message_after_refresh = await recipientPage.getByText(message, { exact: true }).first().isVisible().catch(() => false);
  report.recipient_messages_after_refresh = (await recipientPage.locator('body').innerText()).slice(0, 1500);
  await recipientContext.close();

  for (const [label, persona] of [['sender', sender], ['recipient', recipient]]) {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: persona.test_email, password: passwordFor(persona) });
    if (authError) throw authError;
    const { data, error } = await supabase.from('conversations').select('id, conversation_participants!inner(user_id), messages(text)').eq('conversation_participants.user_id', (await supabase.auth.getUser()).data.user.id);
    if (error) throw error;
    report.checks[`${label}_database_sees_message`] = data.some((conversation) => conversation.messages?.some((item) => item.text === message));
    await supabase.auth.signOut();
  }
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
}
report.finished_at = new Date().toISOString();
report.passed = !report.error && Object.values(report.checks).length === 7 && Object.values(report.checks).every(Boolean);
if (!report.passed) report.defects.push({ severity: 'P1', title: 'Direct message does not complete the required cross-user persistence flow', failed_checks: Object.entries(report.checks).filter(([, passed]) => !passed).map(([name]) => name), error: report.error ?? null });
const outputDir = new URL('./results/', import.meta.url);
await mkdir(outputDir, { recursive: true });
const output = new URL(`direct-message-${environment.runId}.json`, outputDir);
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ report: output.pathname, passed: report.passed, checks: report.checks, defects: report.defects, error: report.error }, null, 2));
if (!report.passed) process.exitCode = 1;

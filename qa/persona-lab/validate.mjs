import assert from 'node:assert/strict';
import { personas } from './personas.mjs';
import { scenarios } from './scenarios.mjs';
import { assignments, pilotPersonaIds, pilotAssignments } from './assignments.mjs';
import { assertIsolatedEnvironment } from './guard.mjs';

assert.equal(personas.length, 100, 'must define exactly 100 personas');
assert.equal(new Set(personas.map((p) => p.persona_id)).size, 100, 'persona ids must be unique');
assert.ok(personas.every((p) => p.synthetic === true && p.test_email.endsWith('@example.test')), 'all identities must be synthetic');
assert.ok(personas.every((p) => p.personality?.decision_style && p.personality?.communication_style), 'every persona must have a feedback personality');
assert.ok(new Set(personas.map((p) => `${p.personality.decision_style}:${p.personality.communication_style}:${p.personality.trust_concern}`)).size >= 20, 'personality combinations must be meaningfully varied');

const expectedCohorts = new Map([
  ['creator', 18], ['collaborator', 18], ['team-lead', 12], ['professional', 10],
  ['company-representative', 8], ['trust-safety', 8], ['accessibility', 8],
  ['device-network', 8], ['membership', 6], ['admin', 4],
]);
for (const [cohort, expected] of expectedCohorts) {
  assert.equal(personas.filter((p) => p.cohort === cohort).length, expected, `${cohort} cohort count`);
}

assert.equal(scenarios.length, 24, 'must define exactly 24 scenarios');
assert.equal(new Set(scenarios.map((s) => s.scenario_id)).size, 24, 'scenario ids must be unique');
assert.equal(assignments.length, 600, 'each persona must receive six scenarios');
assert.ok(assignments.every((a) => personas.some((p) => p.persona_id === a.persona_id)), 'assignment persona must exist');
assert.ok(assignments.every((a) => scenarios.some((s) => s.scenario_id === a.scenario_id)), 'assignment scenario must exist');
for (const scenario of scenarios) {
  const count = assignments.filter((a) => a.scenario_id === scenario.scenario_id).length;
  assert.ok(count >= 10, `${scenario.scenario_id} must have at least 10 personas, got ${count}`);
}

assert.equal(pilotPersonaIds.length, 12, 'pilot must contain 12 personas');
assert.equal(new Set(pilotPersonaIds).size, 12, 'pilot persona ids must be unique');
assert.ok(pilotPersonaIds.every((id) => personas.some((p) => p.persona_id === id)), 'pilot personas must exist');
assert.ok(new Set(pilotPersonaIds.map((id) => personas.find((p) => p.persona_id === id).cohort)).size >= 10, 'pilot must span every cohort');
assert.equal(pilotAssignments.length, 72, 'pilot personas must retain six scenarios each');

assert.throws(() => assertIsolatedEnvironment({
  OPPNETS_QA_APP_URL: 'https://oppnets.com',
  OPPNETS_QA_SUPABASE_URL: 'https://piodsfehlkyfzofcdacy.supabase.co',
  OPPNETS_QA_RUN_ID: 'unsafe-production',
  OPPNETS_QA_SYNTHETIC_ONLY: 'true',
}), /QA_ABORT/);
assert.doesNotThrow(() => assertIsolatedEnvironment({
  OPPNETS_QA_APP_URL: 'http://127.0.0.1:4173',
  OPPNETS_QA_SUPABASE_URL: 'https://oppnets-persona-lab.supabase.co',
  OPPNETS_QA_RUN_ID: 'local-validation',
  OPPNETS_QA_SYNTHETIC_ONLY: 'true',
}));

const coverage = Object.fromEntries(scenarios.map((s) => [s.scenario_id, assignments.filter((a) => a.scenario_id === s.scenario_id).length]));
console.log(JSON.stringify({
  status: 'PASS',
  personas: personas.length,
  cohorts: Object.fromEntries([...expectedCohorts].map(([name]) => [name, personas.filter((p) => p.cohort === name).length])),
  scenarios: scenarios.length,
  assignments: assignments.length,
  scenario_coverage_min: Math.min(...Object.values(coverage)),
  scenario_coverage_max: Math.max(...Object.values(coverage)),
  pilot_personas: pilotPersonaIds.length,
  pilot_cohorts: new Set(pilotPersonaIds.map((id) => personas.find((p) => p.persona_id === id).cohort)).size,
}, null, 2));

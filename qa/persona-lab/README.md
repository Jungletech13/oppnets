# OppNets Persona Lab

This directory is a deterministic, synthetic QA harness foundation. It does not create accounts or contact production services.

## Contents

- `personas.mjs`: exactly 100 synthetic fixtures across ten cohorts, with distinct motivations, decision styles, communication styles, patience, and trust concerns.
- `scenarios.mjs`: the 24-scenario product catalog.
- `assignments.mjs`: six deterministic scenarios per persona and a 12-person pilot.
- `guard.mjs`: fail-closed environment checks that reject the production host and Supabase project.
- `validate.mjs`: Node built-in validation for counts, coverage, pilot breadth, synthetic identity rules, and guard behavior.
- `pilot-runner.mjs`: guarded Playwright smoke journeys for the 12-person pilot, with per-persona positive/negative feedback and actionable defects.

## Validate locally

Requires Node.js 18 or newer. No package installation is needed.

```powershell
node qa/persona-lab/validate.mjs
```

Test the guard against a local app and an isolated QA Supabase project:

```powershell
$env:OPPNETS_QA_APP_URL='http://127.0.0.1:4173'
$env:OPPNETS_QA_SUPABASE_URL='https://oppnets-persona-lab.supabase.co'
$env:OPPNETS_QA_RUN_ID='persona-lab-local-001'
$env:OPPNETS_QA_SYNTHETIC_ONLY='true'
node qa/persona-lab/guard.mjs
```

The hostname and project ref above are examples. A real run must use a dedicated, disposable non-production project. The runner must call `assertIsolatedEnvironment()` before any browser or database write. It must also disable outbound email, SMS, payment, analytics, and production webhooks.

Run the local pilot only after the local Vite app and local Supabase are healthy:

```powershell
$env:OPPNETS_QA_APP_URL='http://127.0.0.1:4173'
$env:OPPNETS_QA_SUPABASE_URL='http://127.0.0.1:55321'
$env:OPPNETS_QA_RUN_ID='pilot-local-001'
$env:OPPNETS_QA_SYNTHETIC_ONLY='true'
npm run qa:persona-pilot
```

The pilot uses isolated browser contexts and synthetic local accounts. JSON results are written to `qa/persona-lab/results/`. A nonzero exit indicates setup blocks or P1 defects.

After the pilot passes, run all 100 deterministic personas by adding:

```powershell
$env:OPPNETS_QA_SCOPE='full'
$env:OPPNETS_QA_RUN_ID='persona-full-local-001'
npm run qa:persona-pilot
```

Without `OPPNETS_QA_SCOPE=full`, the runner remains in the safer 12-person pilot mode.

## Pilot

`pilotPersonaIds` selects 12 personas spanning all ten cohorts. Run the pilot first to validate environment, fixtures, and scenario mechanics. Reset the isolated database before scaling to all 100 personas.

## Data rules

Only `@example.test` identities and fictional content are allowed. Do not upload real identity documents, use real payment methods, send external messages, or copy production data into this environment. Store a `test_run_id` and `synthetic=true` marker on generated records wherever the schema permits.

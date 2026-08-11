# Final Bolt Handoff Request

Send the following message directly to the OppNets project chat in Bolt.

---

We are completing a full and permanent handoff of OppNets from Bolt to an independently managed GitHub, Supabase, Cloudflare, and Resend setup.

Do not add features, redesign anything, change the database, alter DNS, rotate or reveal secrets, transfer ownership, unpublish the site, or delete the Bolt project. This request is export and documentation only.

Create one downloadable ZIP named:

`oppnets-final-bolt-handoff-2026-08-05.zip`

The ZIP must contain the latest complete project state, including anything that exists in Bolt but is missing from `Jungletech13/oppnets`:

1. The complete frontend source code and all public assets.
2. Every Supabase migration in the exact order applied to production.
3. Every Supabase Edge Function, especially the deployed `send-email` function, including its templates, shared utilities, CORS handling, and deployment configuration.
4. Any SQL functions, RPCs, triggers, RLS policies, storage-bucket definitions, or schema changes not already represented in GitHub migrations.
5. `supabase/config.toml` and any other Supabase configuration files, if they exist.
6. All authentication and email templates used by the project.
7. A `.env.example` containing variable names and safe placeholders only. Do not include secret values, private keys, service-role keys, API keys, access tokens, passwords, or customer data.
8. A list of every environment-variable and secret name the project requires, where each one is currently configured, and which features depend on it. Do not reveal the values.
9. All deployment, routing, redirect, build, domain, and hosting configuration.
10. A schema-only database snapshot or schema inventory. Do not export personal user data.
11. A migration-drift report comparing the live Supabase project with the migrations currently in GitHub.
12. A list of all storage buckets and their access policies.
13. A list of any uncommitted, unpublished, or Bolt-only changes.
14. A list of known bugs, incomplete workflows, disabled features, mock/demo-data fallbacks, and manual setup steps.
15. The current Bolt project identifier and old Bolt deployment URL so they can be retired after the independent deployment is verified.

Also create `HANDOFF-MANIFEST.md` at the root of the ZIP. It must include:

- the date and time of the export;
- the GitHub repository and latest commit used for comparison;
- the Supabase project reference and region;
- the complete file inventory;
- which files came from Bolt but are not in GitHub;
- which production resources cannot be exported as files;
- the current status of Supabase ownership/claiming;
- the current authentication confirmation, password-reset, SMTP, and redirect-URL settings;
- the current Resend domain-verification and email-function status;
- checksums for the exported files;
- a final statement confirming whether the ZIP is sufficient to run OppNets without Bolt.

Before finishing, verify specifically that the source code for the deployed `send-email` Edge Function is inside the ZIP.

Do not mark the handoff complete if any file or configuration is unavailable. List every unavailable item and explain exactly how the owner can retrieve it.

When the ZIP is ready, provide it as a download. Do not perform the actual separation, deletion, transfer, unpublishing, or DNS cutover.

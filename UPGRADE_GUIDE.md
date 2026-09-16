# Upgrade guide — Fleeto operations release

## Before uploading to GitHub
1. Back up the existing Supabase database and Storage, and use a staging Supabase project to test this upgrade. Do not re-run migration 001.
2. Run **supabase/migrations/002_operations_upgrade.sql** once in the Supabase SQL Editor, after migration 001. This is an additive migration, not a replacement. Its new `CHECK` constraints are intentionally created only once.
3. Existing records receive default receiving mode `DIRECT_PARTNER` and warranty `UNDER_WARRANTY`, **which are placeholders requiring operational review**. Closed existing records are backfilled to TAT `CLOSED`. Edit legacy classifications through an approved process before relying on warranty reporting.
4. The source ZIP supplied for this upgrade has **no package-lock.json**. Run `npm install` locally with working package registry access to create it, then `npm run build`. Commit both `package.json` and the generated `package-lock.json` to GitHub. Do not use `npm ci` until the lockfile exists.
5. For deployment, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel project Settings → Environment Variables. Never commit `.env.local` or service-role credentials. Existing first Super Admin does not need to be bootstrapped again.
6. Push the updated project to the existing GitHub repo, trigger a fresh deployment, and verify the commit hash changes. Do not redeploy a historical failed commit.
7. Sign in as Super Admin, test a new record with receiving mode, warranty, custom field, report downloads and Hold/Resume operations; separately exercise OK and defective workflows and audit trail.

## Implemented in this package
- Additional receipt and warranty fields, visible on service detail, and independent TAT status OPEN/CLOSED/HOLD/OUT_OF_WARRANTY. Initial OUT_OF_WARRANTY derives from warranty choice; close automatically sets CLOSED; permission-gated Hold/Resume changes create audit entries. Warranty and TAT status are intentionally distinct.
- A stepwise node/connected-stage display on each service detail. Backend existing workflow status checks remain sequential; the graphical view follows existing branching.
- Material master creation and material description suggestions.
- Detailed CSV exports with record fields plus serialized status history, logistics, document *metadata* and audit activity; presentation CSV plus on-screen grouping by supplier, distributor, dealer or receipt date. Date range filters receipt date. No document binary files are embedded in CSV. Report fetch is permission checked and capped at 5,000 records; for larger datasets use pagination/batch export.
- Config studio for section headings (those wired to navigation and New Record), custom receipt fields, custom-field display labels/required/enabled flags and SLA threshold configuration, all permission gated. Mandatory core workflow constraints remain non-disableable. Custom fields for other sections can be defined and stored in configuration but **are not yet automatically rendered on every workflow screen**. Renaming arbitrary core field labels in every screen and arbitrary section headings throughout every page is **not implemented**; do not promise this as a completed capability.
- Responsive sidebar, tables with horizontal overflow, input grids and navy/indigo enterprise styling. Accessibility and mobile usability still require device-based acceptance testing.

## Important limits / checks
- Existing `service_records` policies and per-user data visibility follow the original application's permission architecture; do a security review before exposing sensitive data to supplier accounts. Supabase service-role key must remain server-only.
- TAT calendar-day metrics in report measure received-to-return or received-to-factory; HOLD currently **does not subtract hold days**. SLA threshold setting is stored but is not yet displayed as a computed SLA classification.
- Updating Supabase schema is mandatory before deploying this version; missing tables or columns will cause runtime failures.
- No end-to-end test or successful Next.js production build was verified in this environment because project dependencies were not available and dependency installation timed out. Run a full build and tests in staging before production rollout.
- Update Next.js and transitive dependencies to currently patched versions and verify advisories prior to making the application public; the supplied project declares Next 15.1.11 as in your provided ZIP, without an independent current security certification.

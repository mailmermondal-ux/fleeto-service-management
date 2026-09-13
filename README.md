# Fleeto Service Material / Battery Management

Production-oriented starter application for the workflow in **Service Material / Battery Management - DFD & System Requirements**.

It is built for **Vercel + Supabase** with Next.js App Router, Supabase Auth, PostgreSQL, private Supabase Storage, role-based access control, complete status history and audit logging.

## What is implemented

- Material receipt with duplicate-active-serial prevention
- Mandatory material / supply-chain fields
- Testing start and completion timestamps
- Mandatory Test Report upload before testing completion
- OK / Same Return route with mandatory Return Date and automatic TAT display
- Defective route with two separate logistics legs
- Supplier receipt, Under Servicing, mandatory RCA, repair details and return logistics
- Factory receipt and automatic closure
- Full status history and document retention
- User creation, user types / roles, role-permission management
- Supplier, Distributor and Dealer masters
- Audit trail
- Private signed document downloads
- TAT calculations for Overall, Same Return, Service Station, Supplier and both logistics legs

## Default user types / roles

| Role | Default access |
|---|---|
| Super Administrator | Everything |
| Administrator | Operational workflows + users + masters + audit |
| Service Station | Create records, testing, dispatch to supplier |
| Tester / R&D | Testing workflow |
| Supplier Service User | Supplier receipt, servicing, RCA and return dispatch |
| Factory User | Factory receipt and closure |
| Viewer / Management | Read only |

Administrators can change these mappings from **Roles & Permissions**.

## 1. Create the Supabase project

Create a new Supabase project, then open **SQL Editor** and run:

`supabase/migrations/001_initial_schema.sql`

The migration creates all tables, indexes, constraints, the TAT view, the private `service-documents` bucket, default roles and permissions.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Important: `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_` and never expose it in browser code.

## 3. Create the first Super Administrator

After running the SQL migration, add these temporary values to `.env.local`:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@yourcompany.com
BOOTSTRAP_ADMIN_PASSWORD=Use-A-Strong-Password
BOOTSTRAP_ADMIN_NAME=System Administrator
```

Then run:

```bash
npm install
npm run bootstrap-admin
```

After bootstrap, you can remove the `BOOTSTRAP_ADMIN_*` variables. New users can be created from **Admin > Users**.

## 4. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Fleeto service management app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 6. Deploy directly on Vercel

1. Vercel > **Add New > Project**.
2. Import the GitHub repository.
3. Add these Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optionally `NEXT_PUBLIC_APP_NAME`
4. Deploy. Vercel detects Next.js automatically.

No database connection string is required by this app; it uses the Supabase API.

## Security design

- Supabase tables have RLS enabled.
- Direct browser access is intentionally minimal; application data is accessed through authenticated Next.js server routes.
- Server routes verify the logged-in Supabase user and required permission before using the service-role client.
- Test Reports and RCA documents are stored in a private bucket and opened with short-lived signed URLs.
- Workflow stage access is split across role permissions.
- Supplier Receiving Date is effectively locked by workflow state: after confirmation, the record moves forward and the normal UI cannot overwrite it.
- Closed records have no normal edit workflow. A dedicated `service.admin_edit` permission is seeded for future controlled correction functionality.

## Important workflow behavior

The requirement contains statuses that happen immediately one after another. To preserve the complete history while keeping the UI efficient:

- Supplier receipt writes **Received at Supplier End**, then immediately records **Under Servicing** as current status.
- Supplier return writes **Returning from Supplier End**, then **In Transit to Factory**.
- Factory receipt writes **Battery Received at Factory**, then **Closed**.
- OK testing writes **Material OK - Same Return**, then **Closed** after Return Date is present.

Thus all 12 required statuses are retained in status history even when the current status advances immediately.

## File upload limits

The migration configures a 10 MB private bucket limit and allows PDF, JPEG, PNG and DOCX. Change `storage.buckets.file_size_limit` / `allowed_mime_types` if your organization needs other limits.

## Recommended production hardening before enterprise rollout

- Configure Supabase SMTP / SSO according to your identity policy.
- Add rate limiting / WAF rules for public endpoints if exposed externally.
- Add an explicit admin-only correction screen if closed-record corrections are required operationally.
- Add organization-specific SLA thresholds and escalation notifications.
- Add automated backups / PITR and retention settings in Supabase.
- Add domain-specific field validation (serial format, supplier codes, etc.) if known.

## Project structure

```text
app/                    Next.js UI and API route handlers
components/             shared UI
lib/                    auth, Supabase clients, workflow/TAT helpers
supabase/migrations/    database + RBAC + storage setup
scripts/                first-admin bootstrap utility
```

-- Apply AFTER 001_initial_schema.sql, once, in Supabase SQL Editor.
-- Existing records retain their workflow and default to OPEN/UNDER_WARRANTY until reviewed.
create table if not exists public.materials (
 id uuid primary key default gen_random_uuid(),
 name text not null unique, sku text unique, description text,
 is_active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
alter table public.service_records add column if not exists receiving_mode text not null default 'DIRECT_PARTNER';
alter table public.service_records add column if not exists warranty_status text not null default 'UNDER_WARRANTY';
alter table public.service_records add column if not exists tat_status text not null default 'OPEN';
alter table public.service_records add column if not exists hold_reason text;
alter table public.service_records add column if not exists custom_fields jsonb not null default '{}'::jsonb;
alter table public.service_records add constraint receiving_mode_valid check (receiving_mode in ('DIRECT_PARTNER','FLEETO_FACTORY'));
alter table public.service_records add constraint warranty_status_valid check (warranty_status in ('UNDER_WARRANTY','OUT_OF_WARRANTY'));
alter table public.service_records add constraint tat_status_valid check (tat_status in ('OPEN','CLOSED','HOLD','OUT_OF_WARRANTY'));
update public.service_records set tat_status='CLOSED' where current_status='CLOSED' and tat_status <> 'CLOSED';
-- Review legacy warranty and receiving-mode classifications manually: defaults are placeholders, not verified history.
-- Configurable per-section labels/fields, not physical schema changes. Reserved core fields cannot be deleted.
create table if not exists public.section_config (
 section_key text primary key,
 display_name text not null,
 updated_by uuid references public.profiles(id),updated_at timestamptz not null default now()
);
create table if not exists public.field_config (
 id uuid primary key default gen_random_uuid(),section_key text not null,
 field_key text not null,display_name text not null,
 field_type text not null default 'text' check(field_type in ('text','number','date','select','textarea')),
 required boolean not null default false,enabled boolean not null default true,
 options jsonb not null default '[]'::jsonb,
 is_custom boolean not null default true,
 unique(section_key,field_key),
 check(field_key ~ '^[a-z][a-z0-9_]{0,62}$')
);
create table if not exists public.validation_rules (
 rule_key text primary key,display_name text not null,enabled boolean not null default true,
 parameter_value integer,description text
);
insert into public.validation_rules(rule_key,display_name,enabled,description) values
 ('sale_before_receipt','Sale date must not be after receipt',true,'Database enforces this mandatory integrity rule.'),
 ('duplicate_active_serial','Prevent duplicate active serial numbers',true,'Database unique index enforces this mandatory integrity rule.'),
 ('test_report_required','Test report before testing completion',true,'Mandatory safety/workflow rule; cannot be disabled.'),
 ('rca_required','RCA before supplier return',true,'Mandatory safety/workflow rule; cannot be disabled.'),
 ('tat_sla_days','Open-record SLA threshold (calendar days)',true,'Configure the TAT dashboard aging indicator')
on conflict(rule_key) do nothing;
update public.validation_rules set parameter_value=14 where rule_key='tat_sla_days' and parameter_value is null;
insert into public.section_config(section_key,display_name) values
 ('dashboard','Dashboard'),('service_create','New Service Record'),('services','Services'),
 ('workflow','Service Workflow'),('masters','Masters'),('reporting','Reporting')
on conflict(section_key) do nothing;
insert into public.permissions(code,name,description) values
 ('reports.view','View reports','Access operational and TAT reporting'),
 ('config.manage','Manage configuration','Configure fields, labels and adjustable validation rules'),
 ('workflow.tat_manage','Manage TAT status','Place an active case on hold or restore its TAT state')
on conflict(code) do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p where r.code='SUPER_ADMIN' on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('reports.view','config.manage','workflow.tat_manage') where r.code='ADMIN' on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code='reports.view' where r.code='VIEWER' on conflict do nothing;
create index if not exists service_records_tat_status_idx on public.service_records(tat_status);
create index if not exists service_records_received_date_idx on public.service_records(received_date_rnd);
alter table public.section_config enable row level security;
alter table public.field_config enable row level security;
alter table public.validation_rules enable row level security;
-- Config is only accessed through authenticated, permission-checked server endpoints.
-- Keep core integrity rules enforced in database; only optional threshold configurable.

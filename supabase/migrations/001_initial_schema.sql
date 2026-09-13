-- Fleeto Service Management - initial schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  code text primary key,
  name text not null,
  description text
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key(role_id, permission_code)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), name text unique not null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(), name text unique not null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.dealers (
  id uuid primary key default gen_random_uuid(), name text unique not null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null,
  material_description text not null,
  received_date_rnd date not null,
  supplier_name text not null,
  distributor_name text not null,
  dealer_name text not null,
  sale_date date not null,
  defined_issue text not null,
  current_status text not null default 'MATERIAL_RECEIVED' check (current_status in (
    'MATERIAL_RECEIVED','TESTING_STARTED','MATERIAL_OK_SAME_RETURN','SEND_TO_SUPPLIER_END',
    'IN_TRANSIT_TO_SUPPLIER','RECEIVED_AT_SUPPLIER_END','UNDER_SERVICING','SERVICING_COMPLETED',
    'RETURNING_FROM_SUPPLIER_END','IN_TRANSIT_TO_FACTORY','BATTERY_RECEIVED_AT_FACTORY','CLOSED')),
  material_condition text check (material_condition in ('OK','DEFECTIVE')),
  testing_started_at timestamptz,
  testing_completed_at timestamptz,
  return_date date,
  supplier_receiving_date date,
  servicing_completion_date date,
  repair_action text,
  replaced_components text,
  supplier_remarks text,
  factory_receiving_date date,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sale_date <= received_date_rnd),
  check (return_date is null or return_date >= received_date_rnd),
  check (supplier_receiving_date is null or supplier_receiving_date >= received_date_rnd),
  check (servicing_completion_date is null or supplier_receiving_date is null or servicing_completion_date >= supplier_receiving_date),
  check (factory_receiving_date is null or factory_receiving_date >= received_date_rnd)
);
create unique index if not exists ux_service_active_serial on public.service_records(serial_number) where current_status <> 'CLOSED';
create index if not exists ix_service_status on public.service_records(current_status);
create index if not exists ix_service_serial on public.service_records(serial_number);

create table if not exists public.logistics_movements (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  leg text not null check (leg in ('TO_SUPPLIER','TO_FACTORY')),
  logistic_company text not null,
  tracking_id text not null,
  eta_date date,
  dispatch_date date not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(service_record_id, leg)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  document_type text not null check (document_type in ('TEST_REPORT','RCA')),
  storage_path text unique not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records(id) on delete cascade,
  status text not null,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now(),
  notes text
);
create index if not exists ix_status_history_record on public.status_history(service_record_id, changed_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ix_audit_created on public.audit_logs(created_at desc);

-- Keep auth users mirrored into profiles.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do update set email=excluded.email, full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name);
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email,raw_user_meta_data on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_user_permissions(p_user_id uuid)
returns table(permission_code text) language sql stable security definer set search_path=public as $$
  select distinct rp.permission_code
  from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id
  join public.profiles p on p.id=ur.user_id
  where ur.user_id=p_user_id and p.is_active=true;
$$;

-- TAT reporting view, all values in calendar days.
create or replace view public.service_record_tat as
select s.id,
  case when s.factory_receiving_date is not null then s.factory_receiving_date-s.received_date_rnd end as overall_tat_days,
  case when s.return_date is not null then s.return_date-s.received_date_rnd end as same_return_tat_days,
  case when ls.dispatch_date is not null then ls.dispatch_date-s.received_date_rnd end as service_station_tat_days,
  case when lf.dispatch_date is not null and s.supplier_receiving_date is not null then lf.dispatch_date-s.supplier_receiving_date end as supplier_tat_days,
  case when s.supplier_receiving_date is not null and ls.dispatch_date is not null then s.supplier_receiving_date-ls.dispatch_date end as logistics_to_supplier_tat_days,
  case when s.factory_receiving_date is not null and lf.dispatch_date is not null then s.factory_receiving_date-lf.dispatch_date end as logistics_to_factory_tat_days
from public.service_records s
left join public.logistics_movements ls on ls.service_record_id=s.id and ls.leg='TO_SUPPLIER'
left join public.logistics_movements lf on lf.service_record_id=s.id and lf.leg='TO_FACTORY';

-- RLS: direct browser table access is blocked; server routes enforce RBAC using the service-role key.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.suppliers enable row level security;
alter table public.distributors enable row level security;
alter table public.dealers enable row level security;
alter table public.service_records enable row level security;
alter table public.logistics_movements enable row level security;
alter table public.documents enable row level security;
alter table public.status_history enable row level security;
alter table public.audit_logs enable row level security;

-- Authenticated users may only read their own basic profile directly. Everything else is accessed server-side.
create policy "profile_self_read" on public.profiles for select to authenticated using (id=auth.uid());

-- Private file bucket for test reports and RCA documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-documents','service-documents',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do nothing;

-- Seed permissions.
insert into public.permissions(code,name,description) values
('service.view','View service records','View service records, history, logistics and documents'),
('service.create','Create service records','Create records at material receipt'),
('workflow.testing','Testing workflow','Start testing, upload test result, decide OK/Defective'),
('workflow.supplier_dispatch','Dispatch to supplier','Enter outbound supplier logistics and dispatch'),
('workflow.supplier_service','Supplier servicing workflow','Confirm supplier receipt, RCA, repair and return dispatch'),
('workflow.factory_receipt','Factory receipt & closure','Confirm factory receipt and close defective route'),
('service.admin_edit','Admin edit closed records','Reserved for controlled corrections to closed records'),
('users.manage','Manage users','Create users and assign roles'),
('roles.manage','Manage roles','Configure role permission mappings'),
('masters.manage','Manage supply chain masters','Create supplier, distributor and dealer values'),
('audit.view','View audit trail','View system audit history')
on conflict(code) do update set name=excluded.name, description=excluded.description;

-- Seed roles representing user types in this workflow.
insert into public.roles(code,name,description) values
('SUPER_ADMIN','Super Administrator','Full system access'),
('ADMIN','Administrator','Operational administration, user and master management'),
('SERVICE_STATION','Service Station','Material receipt, testing and supplier dispatch'),
('TESTER','Tester / R&D','Testing and test result processing'),
('SUPPLIER','Supplier Service User','Supplier receipt, servicing, RCA and return dispatch'),
('FACTORY','Factory User','Factory receipt and closure'),
('VIEWER','Viewer / Management','Read-only service and reporting access')
on conflict(code) do update set name=excluded.name, description=excluded.description;

-- Default permission mapping.
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p where r.code='SUPER_ADMIN'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view','service.create','workflow.testing','workflow.supplier_dispatch','workflow.supplier_service','workflow.factory_receipt','users.manage','masters.manage','audit.view') where r.code='ADMIN'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view','service.create','workflow.testing','workflow.supplier_dispatch') where r.code='SERVICE_STATION'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view','workflow.testing') where r.code='TESTER'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view','workflow.supplier_service') where r.code='SUPPLIER'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view','workflow.factory_receipt') where r.code='FACTORY'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r join public.permissions p on p.code in ('service.view') where r.code='VIEWER'
on conflict do nothing;

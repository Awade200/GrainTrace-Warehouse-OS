
begin;
create schema if not exists graintrace;
revoke all on schema graintrace from public, anon, authenticated;
create table if not exists graintrace.admin_users (
 user_id uuid primary key, created_at timestamptz not null default now()
);
create table if not exists graintrace.mills (
 id uuid primary key default gen_random_uuid(), name text not null, address text not null,
 latitude numeric(10,7) not null check(latitude between -90 and 90),
 longitude numeric(10,7) not null check(longitude between -180 and 180),
 contact text, status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists graintrace.receipts (
 id uuid primary key default gen_random_uuid(), reference text not null unique,
 mill_id uuid not null references graintrace.mills(id), received_at timestamptz not null default now(),
 notes text
);
create table if not exists graintrace.bags (
 id uuid primary key default gen_random_uuid(), receipt_id uuid not null references graintrace.receipts(id),
 code text not null unique, gate_kg numeric(14,3) not null check(gate_kg>0),
 clean_kg numeric(14,3) check(clean_kg>=0 and clean_kg<=gate_kg),
 processed_at timestamptz
);
create table if not exists graintrace.dispatches (
 id uuid primary key default gen_random_uuid(), reference text not null unique,
 buyer text not null, dispatched_at timestamptz not null default now(),
 scale_kg numeric(14,3) not null check(scale_kg>0)
);
create table if not exists graintrace.dispatch_lines (
 id uuid primary key default gen_random_uuid(),
 dispatch_id uuid not null references graintrace.dispatches(id),
 bag_id uuid not null references graintrace.bags(id),
 weight_kg numeric(14,3) not null check(weight_kg>0),
 unique(dispatch_id,bag_id)
);
create table if not exists graintrace.documents (
 id uuid primary key default gen_random_uuid(), mill_id uuid not null references graintrace.mills(id),
 label text not null, object_path text not null unique, mime_type text,
 audit_visible boolean not null default false,
 uploaded_at timestamptz not null default now()
);
create table if not exists graintrace.audit_links (
 id uuid primary key default gen_random_uuid(),
 dispatch_id uuid not null references graintrace.dispatches(id),
 token_hash text not null unique,
 expires_at timestamptz not null,
 revoked_at timestamptz, created_by uuid not null,
 created_at timestamptz not null default now()
);
create table if not exists graintrace.audit_access_logs (
 id bigint generated always as identity primary key,
 link_id uuid references graintrace.audit_links(id),
 accessed_at timestamptz not null default now(),
 outcome text not null check(outcome in ('granted','expired','revoked','invalid')),
 user_agent text
);
insert into graintrace.admin_users(user_id) values ('f00aac6d-aa87-4578-9c23-966a40a62cea')
on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('graintrace-documents','graintrace-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
alter table graintrace.admin_users enable row level security;
alter table graintrace.mills enable row level security;
alter table graintrace.receipts enable row level security;
alter table graintrace.bags enable row level security;
alter table graintrace.dispatches enable row level security;
alter table graintrace.dispatch_lines enable row level security;
alter table graintrace.documents enable row level security;
alter table graintrace.audit_links enable row level security;
alter table graintrace.audit_access_logs enable row level security;
revoke all on all tables in schema graintrace from public, anon, authenticated;
commit;

-- Fictional sample records are in graintrace-demo-seed.sql.

create table public.password_reset_otps (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

grant all on public.password_reset_otps to service_role;

alter table public.password_reset_otps enable row level security;
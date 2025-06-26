-- Migration : Table des automatisations pour HelpDesk
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_keyword text not null,
  trigger_location text not null check (trigger_location in ('title', 'description', 'message')),
  reason text,
  action_type text not null check (action_type in ('ia_reply', 'status_change', 'assign_agent')),
  action_ia_prompt text,
  action_status_to_set text,
  action_agent_id uuid,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour recherche rapide sur triggers
create index if not exists idx_automations_trigger on public.automations(trigger_keyword, trigger_location);

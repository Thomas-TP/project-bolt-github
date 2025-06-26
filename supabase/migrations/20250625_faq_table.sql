-- Table FAQ dynamique (pro, images automatiques)
create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  images text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index pour recherche rapide
create index if not exists idx_faq_question on public.faq using gin (to_tsvector('french', question));
create index if not exists idx_faq_answer on public.faq using gin (to_tsvector('french', answer));

-- Trigger pour updated_at
create or replace function update_faq_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_faq_updated_at on public.faq;
create trigger set_faq_updated_at
before update on public.faq
for each row execute procedure update_faq_updated_at();

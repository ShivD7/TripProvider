create table if not exists public.saved_itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  trip_length_days integer,
  itinerary_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.saved_itineraries enable row level security;

create policy "Users can read their own saved itineraries"
on public.saved_itineraries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own saved itineraries"
on public.saved_itineraries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own saved itineraries"
on public.saved_itineraries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own saved itineraries"
on public.saved_itineraries
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists saved_itineraries_user_created_at_idx
on public.saved_itineraries (user_id, created_at desc);

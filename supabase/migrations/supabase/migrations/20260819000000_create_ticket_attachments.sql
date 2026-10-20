-- ============================================================
-- Ticket Attachments
-- Private storage for ticket screenshots / images
-- ============================================================

-- IMPORTANT:
-- This migration must live directly under:
--   supabase/migrations/
-- NOT under supabase/migrations/supabase/migrations/.

insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Make (ticket_id, id) a valid composite reference target so the database
-- itself enforces that an attachment comment belongs to the same ticket.
alter table public.ticket_comments
  add constraint ticket_comments_ticket_id_id_unique unique (ticket_id, id);

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
    references public.tickets(id)
    on delete cascade,

  comment_id uuid null
    references public.ticket_comments(id)
    on delete cascade,

  uploaded_by uuid not null
    references auth.users(id)
    on delete cascade,

  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,

  created_at timestamptz not null default now(),

  -- One Storage object must map to one attachment record.
  constraint ticket_attachments_storage_path_unique unique (storage_path),

  -- Metadata must always point at the same ticket as its comment.
  constraint ticket_attachments_comment_ticket_fk
    foreign key (ticket_id, comment_id)
    references public.ticket_comments(ticket_id, id)
);

create index if not exists idx_ticket_attachments_ticket_id
  on public.ticket_attachments(ticket_id);

create index if not exists idx_ticket_attachments_comment_id
  on public.ticket_attachments(comment_id);

create index if not exists idx_ticket_attachments_uploaded_by
  on public.ticket_attachments(uploaded_by);

alter table public.ticket_attachments enable row level security;

create policy "Users can view permitted ticket attachments"
on public.ticket_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_attachments.ticket_id
      and (
        t.submitted_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
  )
  and
  (
    ticket_attachments.comment_id is null
    or public.has_role(auth.uid(), 'admin')
    or exists (
      select 1
      from public.ticket_comments c
      where c.id = ticket_attachments.comment_id
        and c.ticket_id = ticket_attachments.ticket_id
        and c.is_internal = false
    )
  )
);

create policy "Users can upload attachments to permitted tickets"
on public.ticket_attachments
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_attachments.ticket_id
      and (
        t.submitted_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
  )
  and
  (
    ticket_attachments.comment_id is null
    or public.has_role(auth.uid(), 'admin')
    or exists (
      select 1
      from public.ticket_comments c
      where c.id = ticket_attachments.comment_id
        and c.ticket_id = ticket_attachments.ticket_id
        and c.is_internal = false
    )
  )
);

create policy "Users can delete permitted ticket attachments"
on public.ticket_attachments
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- Private Storage policies
-- ============================================================
-- Application code uses this path format:
--   <ticket_uuid>/<random_uuid>-<safe_filename>
-- Storage itself therefore validates the first path segment against
-- the ticket the authenticated user is allowed to access.

create policy "Users can view ticket attachment files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and exists (
    select 1
    from public.ticket_attachments ta
    join public.tickets t
      on t.id = ta.ticket_id
    where ta.storage_path = storage.objects.name
      and (
        t.submitted_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
      and (
        ta.comment_id is null
        or public.has_role(auth.uid(), 'admin')
        or exists (
          select 1
          from public.ticket_comments c
          where c.id = ta.comment_id
            and c.ticket_id = ta.ticket_id
            and c.is_internal = false
        )
      )
  )
);

create policy "Users can upload ticket attachment files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ticket-attachments'
  and position('/' in name) > 1
  and exists (
    select 1
    from public.tickets t
    where t.id::text = split_part(name, '/', 1)
      and (
        t.submitted_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
  )
);

create policy "Users can delete ticket attachment files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and exists (
    select 1
    from public.ticket_attachments ta
    join public.tickets t
      on t.id = ta.ticket_id
    where ta.storage_path = storage.objects.name
      and (
        ta.uploaded_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
  )
);
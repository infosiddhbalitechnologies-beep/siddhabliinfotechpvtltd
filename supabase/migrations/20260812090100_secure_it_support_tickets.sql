-- Server-side enforcement (defense in depth, on top of app-level checks):
-- the public contact/career/enquiry forms may still be submitted by anyone,
-- but "it_support" tickets (created by the chatbot) may ONLY be inserted by
-- an authenticated user, and only with themselves as the owner. This holds
-- even if someone calls the tickets table directly, bypassing the app.

DROP POLICY IF EXISTS "Anyone can create a ticket" ON public.tickets;

CREATE POLICY "Public ticket types anyone can create" ON public.tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (type IN ('contact', 'career', 'enquiry'));

CREATE POLICY "IT support tickets require authenticated owner" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (type = 'it_support' AND submitted_by = auth.uid());

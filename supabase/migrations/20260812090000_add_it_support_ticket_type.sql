-- Adds a dedicated ticket type for chatbot-originated support tickets, plus
-- category/industry columns the chatbot's slot-filling flow collects.
-- Kept in its own migration because a freshly added enum value cannot be
-- referenced by other statements in the same transaction.

ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'it_support';

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT;

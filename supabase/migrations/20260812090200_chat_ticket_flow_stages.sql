-- Extends the chatbot's slot-filling stage machine with an in-chat ticket
-- creation sub-flow (category -> description -> priority -> confirm), and a
-- scratch column to hold the ticket draft while it's being collected.

ALTER TABLE public.chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_stage_check;

ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_stage_check CHECK (
    stage IN (
      'ask_name',
      'ask_contact',
      'faq',
      'ticket_category',
      'ticket_description',
      'ticket_priority',
      'ticket_confirm'
    )
  );

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS ticket_draft JSONB NOT NULL DEFAULT '{}'::jsonb;

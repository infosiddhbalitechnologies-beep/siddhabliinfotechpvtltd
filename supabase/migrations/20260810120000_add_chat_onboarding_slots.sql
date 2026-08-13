-- Adds Rasa-style slot-filling state to chat_sessions:
-- stage tracks where the visitor is in the onboarding flow, and
-- visitor_name / visitor_contact hold the collected slots.

ALTER TABLE public.chat_sessions
  ADD COLUMN stage TEXT NOT NULL DEFAULT 'ask_name'
    CHECK (stage IN ('ask_name', 'ask_contact', 'faq')),
  ADD COLUMN visitor_name TEXT,
  ADD COLUMN visitor_contact TEXT;

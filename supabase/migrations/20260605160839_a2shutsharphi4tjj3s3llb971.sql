-- Enquiries table: Contact / Business Enquiry / Request a Call.
-- Fully separate from public.tickets — IT support tickets are never
-- stored here and this table is never referenced by the it_support flow.

CREATE TYPE public.enquiry_type AS ENUM ('contact', 'business', 'call_back');
CREATE TYPE public.enquiry_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE SEQUENCE public.enquiry_number_seq START 1000;

CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number TEXT UNIQUE NOT NULL,
  type public.enquiry_type NOT NULL,
  status public.enquiry_status NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.enquiries TO authenticated;
GRANT INSERT ON public.enquiries TO anon;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_enquiries_status ON public.enquiries(status);
CREATE INDEX idx_enquiries_type ON public.enquiries(type);
CREATE INDEX idx_enquiries_created_at ON public.enquiries(created_at DESC);

-- Auto-generate enquiry_number
CREATE OR REPLACE FUNCTION public.generate_enquiry_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.enquiry_number IS NULL OR NEW.enquiry_number = '' THEN
    NEW.enquiry_number := 'ENQ-' || to_char(now(), 'YYYY') || '-' ||
                           lpad(nextval('public.enquiry_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enquiries_number BEFORE INSERT ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.generate_enquiry_number();

REVOKE EXECUTE ON FUNCTION public.generate_enquiry_number() FROM PUBLIC, anon, authenticated;

-- Touch updated_at (reuses the existing public.touch_updated_at() function
-- already defined for public.tickets — not redefined here)
CREATE TRIGGER trg_enquiries_touch BEFORE UPDATE ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS POLICIES

-- Anyone (guest or logged-in) can submit an enquiry — no auth required,
-- and there is no "submitted_by" concept: enquiries are not tied to an
-- authenticated owner the way it_support tickets are.
CREATE POLICY "Anyone can create an enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read enquiries (reuses the existing public.has_role()
-- function already defined for tickets RLS).
CREATE POLICY "Admins read enquiries" ON public.enquiries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update enquiries (status changes, etc.)
CREATE POLICY "Admins update enquiries" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
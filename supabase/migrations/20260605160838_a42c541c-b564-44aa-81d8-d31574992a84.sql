
-- 1) Roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.ticket_type AS ENUM ('contact', 'career', 'enquiry');
CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting_on_user','resolved','closed');
CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');

-- 2) Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4) Tickets
CREATE SEQUENCE public.ticket_number_seq START 1000;

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  type public.ticket_type NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT INSERT ON public.tickets TO anon;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tickets_submitted_by ON public.tickets(submitted_by);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_type ON public.tickets(type);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);

-- Auto-generate ticket_number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'AXY-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('public.ticket_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tickets_number BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_tickets_touch BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION public.set_resolved_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('resolved','closed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tickets_resolved BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_resolved_at();

-- 5) Comments
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_comments TO authenticated;
GRANT ALL ON public.ticket_comments TO service_role;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_ticket ON public.ticket_comments(ticket_id);

-- 6) Status history
CREATE TABLE public.ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  from_status public.ticket_status,
  to_status public.ticket_status,
  from_assigned UUID,
  to_assigned UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_status_history TO authenticated;
GRANT ALL ON public.ticket_status_history TO service_role;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_history_ticket ON public.ticket_status_history(ticket_id);

CREATE OR REPLACE FUNCTION public.log_ticket_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_status_history(ticket_id, changed_by, from_status, to_status, from_assigned, to_assigned)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, OLD.assigned_to, NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tickets_history AFTER UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_change();

-- 7) Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) RLS POLICIES

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- tickets
CREATE POLICY "Anyone can create a ticket" ON public.tickets FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Users read own tickets" ON public.tickets FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- comments
CREATE POLICY "Read comments on visible tickets" ON public.ticket_comments FOR SELECT TO authenticated
  USING (
    (NOT is_internal AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND (t.submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
    OR (is_internal AND public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "Post comments on own ticket or as admin" ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      (NOT is_internal AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND (t.submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
      OR (is_internal AND public.has_role(auth.uid(),'admin'))
    )
  );

-- history
CREATE POLICY "Read history of visible tickets" ON public.ticket_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND (t.submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

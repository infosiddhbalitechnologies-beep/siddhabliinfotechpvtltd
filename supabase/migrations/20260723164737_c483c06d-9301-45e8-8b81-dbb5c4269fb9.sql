CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'SIDDH-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('public.ticket_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
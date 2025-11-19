-- Enable realtime for emails table
ALTER TABLE public.emails REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
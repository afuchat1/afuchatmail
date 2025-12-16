-- Add policy to allow anyone to look up OAuth applications by client_id for authorization
CREATE POLICY "Anyone can view OAuth apps for authorization" 
ON public.oauth_applications 
FOR SELECT 
USING (true);
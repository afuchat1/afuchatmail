-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check email address limit
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT public.has_role(NEW.user_id, 'admin') INTO is_admin;
  
  -- Admins can create unlimited
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Count existing non-alias email addresses for this user
  SELECT COUNT(*) INTO email_count
  FROM public.email_addresses
  WHERE user_id = NEW.user_id
    AND is_alias = false;
  
  -- Limit to 3 for regular users
  IF email_count >= 3 THEN
    RAISE EXCEPTION 'Email address limit reached. Regular users can only create up to 3 email addresses.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce the limit
CREATE TRIGGER enforce_email_address_limit
BEFORE INSERT ON public.email_addresses
FOR EACH ROW
EXECUTE FUNCTION public.check_email_address_limit();
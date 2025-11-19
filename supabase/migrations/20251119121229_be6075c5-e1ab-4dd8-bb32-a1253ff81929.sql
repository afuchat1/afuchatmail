-- Add original_folder_id to track where email came from before deletion
ALTER TABLE public.emails 
ADD COLUMN original_folder_id uuid REFERENCES public.folders(id);

-- Add index for better performance when filtering by original folder
CREATE INDEX idx_emails_original_folder_id ON public.emails(original_folder_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.emails.original_folder_id IS 'Stores the folder_id before email was moved to trash, used for restore functionality.';
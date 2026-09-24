BEGIN;

-- SHEHARA | Dynamic Branding + Runtime Theme + Custom TTF
-- Adds persistent theme tokens and custom font metadata to site_settings.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS theme_colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_font_url text NOT NULL DEFAULT '/custom-font.ttf',
  ADD COLUMN IF NOT EXISTS custom_font_name text NOT NULL DEFAULT 'CustomFont',
  ADD COLUMN IF NOT EXISTS custom_font_original_name text NOT NULL DEFAULT 'custom-font.ttf';

-- Ensure the single settings row exists.
INSERT INTO public.site_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

UPDATE public.site_settings
SET
  theme_colors = CASE
    WHEN theme_colors IS NULL THEN '{}'::jsonb
    ELSE theme_colors
  END,
  custom_font_url = CASE
    WHEN COALESCE(custom_font_url, '') = '' THEN '/custom-font.ttf'
    ELSE custom_font_url
  END,
  custom_font_name = CASE
    WHEN COALESCE(custom_font_name, '') = '' THEN 'CustomFont'
    ELSE custom_font_name
  END,
  custom_font_original_name = CASE
    WHEN COALESCE(custom_font_original_name, '') = '' THEN 'custom-font.ttf'
    ELSE custom_font_original_name
  END
WHERE id = true;

-- The existing branding bucket is also used for the custom TTF.
-- Keep the existing image types and add the common TTF MIME types.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'branding',
  'branding',
  true,
  10485760,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/avif',
    'font/ttf',
    'application/x-font-ttf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/avif',
    'font/ttf',
    'application/x-font-ttf'
  ];

NOTIFY pgrst, 'reload schema';
COMMIT;

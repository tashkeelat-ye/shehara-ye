INSERT INTO public.home_sections (section_key, title, sort_order, is_active)
VALUES ('top_vendors', 'أبرز التجار', 95, true)
ON CONFLICT (section_key) DO NOTHING;
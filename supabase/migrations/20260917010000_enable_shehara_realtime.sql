BEGIN;

DO $$
DECLARE
  table_name text;
  realtime_tables text[] := ARRAY[
    'site_settings',
    'banners',
    'home_sections',
    'products',
    'categories',
    'vendors',
    'pages',
    'faqs',
    'payment_requests',
    'payment_methods',
    'orders',
    'order_items',
    'profiles'
  ];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN

    FOREACH table_name IN ARRAY realtime_tables
    LOOP

      IF to_regclass(
        'public.' || table_name
      ) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN

        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );

      END IF;

    END LOOP;

  ELSE

    CREATE PUBLICATION supabase_realtime;

    FOREACH table_name IN ARRAY realtime_tables
    LOOP

      IF to_regclass(
        'public.' || table_name
      ) IS NOT NULL THEN

        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );

      END IF;

    END LOOP;

  END IF;
END
$$;

COMMIT;

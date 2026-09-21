BEGIN;

-- ============================================================
-- SHEHARA — CUSTOMER SUPPORT CHAT ADMIN UPGRADE
-- ============================================================
-- تعتمد الواجهة على support_threads / support_messages الموجودة
-- في النظام. هذه migration تضيف الفهارس والتحديثات اللازمة
-- للتعامل مع عدد كبير من المحادثات وتفعيل Realtime إن لم يكن
-- مفعلاً مسبقاً.
-- ============================================================

CREATE INDEX IF NOT EXISTS support_threads_last_message_at_idx
  ON public.support_threads (last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_threads_user_id_idx
  ON public.support_threads (user_id);

CREATE INDEX IF NOT EXISTS support_messages_thread_created_at_idx
  ON public.support_messages (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_unread_user_idx
  ON public.support_messages (thread_id, is_read)
  WHERE sender = 'user' AND is_read = false;

-- ============================================================
-- Realtime — يضاف فقط إذا كان الجدول موجوداً ولم تتم إضافته
-- إلى publication سابقاً.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.support_threads') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'support_threads'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads';
  END IF;

  IF to_regclass('public.support_messages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'support_messages'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;

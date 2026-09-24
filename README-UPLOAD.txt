شهارة — تحديث لوحة الهوية والمظهر
التاريخ: 2026-09-24

1) ارفع الملفات إلى GitHub بنفس المسارات الموجودة داخل ZIP.
2) نفّذ ملف SQL الموجود في:
   supabase/migrations/20260924000200_dynamic_branding_theme_and_font.sql
   من SQL Editor في Lovable Cloud/Supabase.
3) لا تغيّر أسماء ملفات Migration.
4) بعد تطبيق SQL ارفع الملفات ثم أعد Build/Publish.
5) الصور التي يرفعها المدير من لوحة الهوية يجب أن تحمل الاسم الظاهر في اللوحة؛ الملفات المخالفة تُرفض.
6) أيقونات 192 و512 يجب أن تكون بالمقاس الدقيق، وإلا تُرفض.
7) الخط يجب أن يكون TTF حقيقيًا؛ يتم فحص امتداده وترويسة الملف قبل الرفع.
8) تحديث PWA/أيقونة التثبيت قد يحتاج إعادة تثبيت التطبيق أو مسح نسخة Service Worker القديمة من المتصفح.
9) SEO الذي يحدثه التطبيق ديناميكيًا يغيّر title/meta/OG/Twitter/canonical أثناء تشغيل الموقع. ظهور القيم الجديدة في نتائج Google يعتمد أيضًا على إعادة الزحف؛ لا يعني الحفظ الفوري تغيير نتيجة البحث.
10) لا تضع أي مفتاح Supabase سري داخل VITE_ أو ملفات المتصفح.

الملفات الأساسية:
- src/routes/admin.branding.tsx
- src/lib/branding.ts
- src/components/app-splash.tsx
- src/components/admin/admin-operations-center.tsx
- src/lib/auth-context.tsx
- src/routes/admin.index.tsx
- src/routes/admin.team.tsx
- supabase/migrations/20260924000200_dynamic_branding_theme_and_font.sql

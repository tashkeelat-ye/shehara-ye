import { createServerFn } from "@tanstack/react-start";

export const ADMIN_EMAIL_DOMAIN = "tashkilat.app";

/**
 * ينشئ حساب الإدارة الوحيد (Ameer) في نظام المصادقة إن لم يكن موجودًا،
 * ويمنحه صلاحية admin. كلمة المرور تُقرأ من الأسرار على الخادم فقط.
 */
export const ensureAdminAccount = createServerFn({ method: "POST" }).handler(async () => {
  const password = process.env["ADMIN_INITIAL_PASSWORD"];
  if (!password) return { ok: false as const, reason: "missing_password" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = `ameer@${ADMIN_EMAIL_DOMAIN}`;

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;

  if (!userId) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Ameer", username: "Ameer" },
    });
    if (error || !created.user) return { ok: false as const, reason: error?.message ?? "create_failed" };
    userId = created.user.id;
  }

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name: "Ameer" }, { onConflict: "id" });
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  return { ok: true as const };
});

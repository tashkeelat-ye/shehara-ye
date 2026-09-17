import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  isValidYemeniPhone,
  normalizeYemeniPhone,
  phoneToEmail,
} from "@/lib/phone";

type CourierRecord = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  account_enabled: boolean;
  created_at: string | null;
  orders_count: number;
};

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  return supabaseAdmin;
}

/**
 * التحقق من أن المستخدم الحالي مدير.
 *
 * مهم:
 * النظام الحالي يستخدم الدور "admin".
 * لا نستخدم "super_admin" هنا لأنه غير معتمد
 * في AccountRole الحالي للمشروع.
 */
async function assertAdmin(userId: string) {
  if (!userId) {
    throw new Error("يجب تسجيل الدخول أولاً.");
  }

  const supabaseAdmin = await getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id,role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[CourierAdmin] Admin role verification failed:",
      error,
    );

    throw new Error(
      "تعذر التحقق من صلاحية الإدارة. تحقق من اتصال قاعدة البيانات ودور المستخدم.",
    );
  }

  if (!data) {
    throw new Error(
      "غير مصرح لك بتنفيذ هذه العملية.",
    );
  }

  return true;
}

const courierBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم عامل التوصيل يجب أن يكون حرفين على الأقل.")
    .max(100, "اسم عامل التوصيل طويل جداً."),

  phone: z
    .string()
    .trim()
    .min(9, "رقم الهاتف غير صحيح.")
    .max(20, "رقم الهاتف غير صحيح."),

  city: z
    .string()
    .trim()
    .min(1, "المحافظة مطلوبة.")
    .max(100, "اسم المحافظة طويل جداً."),

  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
    .max(72, "كلمة المرور طويلة جداً."),
});

const updateCourierSchema = z.object({
  courierId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(2, "اسم عامل التوصيل يجب أن يكون حرفين على الأقل.")
    .max(100, "اسم عامل التوصيل طويل جداً."),

  phone: z
    .string()
    .trim()
    .min(9, "رقم الهاتف غير صحيح.")
    .max(20, "رقم الهاتف غير صحيح."),

  city: z
    .string()
    .trim()
    .min(1, "المحافظة مطلوبة.")
    .max(100, "اسم المحافظة طويل جداً."),
});

const courierIdSchema = z.object({
  courierId: z.string().uuid(),
});

const resetPasswordSchema = z.object({
  courierId: z.string().uuid(),

  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
    .max(72, "كلمة المرور طويلة جداً."),
});

/**
 * =========================================================
 * تحميل جميع عمال التوصيل
 * =========================================================
 */
export const listCourierAccounts = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const supabaseAdmin = await getSupabaseAdmin();

    const { data: couriers, error } = await supabaseAdmin
      .from("couriers")
      .select(
        "id,user_id,name,phone,city,is_active,account_enabled,created_at",
      )
      .order("name");

    if (error) {
      console.error(
        "[CourierAdmin] Failed to load couriers:",
        error,
      );

      throw new Error(
        "تعذر تحميل عمال التوصيل.",
      );
    }

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("courier_id")
      .not("courier_id", "is", null);

    const counts = new Map<string, number>();

    for (const order of orders ?? []) {
      if (!order.courier_id) {
        continue;
      }

      counts.set(
        order.courier_id,
        (counts.get(order.courier_id) ?? 0) + 1,
      );
    }

    return {
      ok: true as const,

      couriers: (couriers ?? []).map(
        (courier): CourierRecord => ({
          id: courier.id,
          user_id: courier.user_id ?? null,
          name: courier.name,
          phone: courier.phone ?? null,
          city: courier.city ?? null,
          is_active: courier.is_active !== false,
          account_enabled:
            courier.account_enabled !== false,
          created_at: courier.created_at ?? null,
          orders_count:
            counts.get(courier.id) ?? 0,
        }),
      ),
    };
  });

/**
 * =========================================================
 * إنشاء عامل توصيل + حساب Auth
 * =========================================================
 *
 * التسجيل العام غير متاح.
 * هذه العملية لا تعمل إلا من لوحة الإدارة.
 */
export const createCourierAccount = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(courierBaseSchema)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const supabaseAdmin = await getSupabaseAdmin();

    const phone = normalizeYemeniPhone(data.phone);

    if (!isValidYemeniPhone(phone)) {
      throw new Error(
        "أدخل رقم هاتف يمني صحيح.",
      );
    }

    const email = phoneToEmail(phone);

    /**
     * منع تكرار الحساب.
     */
    const {
      data: usersData,
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw new Error(usersError.message);
    }

    const existingUser = usersData.users.find(
      (user) =>
        user.email?.toLowerCase() ===
        email.toLowerCase(),
    );

    if (existingUser) {
      throw new Error(
        "رقم الهاتف مرتبط بحساب موجود مسبقاً.",
      );
    }

    /**
     * إنشاء حساب Auth.
     */
    const {
      data: created,
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,

      user_metadata: {
        full_name: data.name.trim(),
        phone,
        account_type: "courier",
      },
    });

    if (createError || !created.user) {
      throw new Error(
        createError?.message ??
          "تعذر إنشاء حساب عامل التوصيل.",
      );
    }

    const userId = created.user.id;

    try {
      /**
       * Profile
       */
      const { error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              full_name: data.name.trim(),
              phone,
              is_disabled: false,
            },
            {
              onConflict: "id",
            },
          );

      if (profileError) {
        throw new Error(
          profileError.message,
        );
      }

      /**
       * Role
       */
      const { error: roleError } =
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            {
              user_id: userId,
              role: "courier",
            },
            {
              onConflict: "user_id,role",
            },
          );

      if (roleError) {
        throw new Error(
          roleError.message,
        );
      }

      /**
       * Courier
       */
      const {
        data: courier,
        error: courierError,
      } = await supabaseAdmin
        .from("couriers")
        .insert({
          user_id: userId,
          name: data.name.trim(),
          phone,
          city: data.city.trim(),
          is_active: true,
          account_enabled: true,
        })
        .select("id")
        .single();

      if (courierError || !courier) {
        throw new Error(
          courierError?.message ??
            "تعذر إنشاء سجل عامل التوصيل.",
        );
      }

      return {
        ok: true as const,
        userId,
        courierId: courier.id,
      };
    } catch (error) {
      /**
       * محاولة تنظيف حساب Auth إذا فشلت إحدى
       * خطوات إنشاء السجل.
       */
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        );
      } catch (cleanupError) {
        console.error(
          "[CourierAdmin] Auth cleanup failed:",
          cleanupError,
        );
      }

      throw error;
    }
  });

/**
 * =========================================================
 * تعديل بيانات عامل التوصيل
 * =========================================================
 */
export const updateCourierAccount = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(updateCourierSchema)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const supabaseAdmin = await getSupabaseAdmin();

    const phone = normalizeYemeniPhone(data.phone);

    if (!isValidYemeniPhone(phone)) {
      throw new Error(
        "أدخل رقم هاتف يمني صحيح.",
      );
    }

    const {
      data: courier,
      error: courierError,
    } = await supabaseAdmin
      .from("couriers")
      .select("id,user_id")
      .eq("id", data.courierId)
      .maybeSingle();

    if (courierError) {
      throw new Error(
        courierError.message,
      );
    }

    if (!courier) {
      throw new Error(
        "عامل التوصيل غير موجود.",
      );
    }

    /**
     * إذا كان الرقم مستخدماً من حساب آخر،
     * نمنع التعديل.
     */
    const email = phoneToEmail(phone);

    const {
      data: usersData,
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw new Error(
        usersError.message,
      );
    }

    const duplicateUser =
      usersData.users.find(
        (user) =>
          user.email?.toLowerCase() ===
            email.toLowerCase() &&
          user.id !== courier.user_id,
      );

    if (duplicateUser) {
      throw new Error(
        "رقم الهاتف مرتبط بحساب مستخدم آخر.",
      );
    }

    /**
     * تحديث سجل العامل.
     */
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("couriers")
      .update({
        name: data.name.trim(),
        phone,
        city: data.city.trim(),
      })
      .eq("id", data.courierId);

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    /**
     * تحديث Profile.
     */
    if (courier.user_id) {
      const {
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: data.name.trim(),
          phone,
        })
        .eq("id", courier.user_id);

      if (profileError) {
        throw new Error(
          profileError.message,
        );
      }

      /**
       * مزامنة بريد Auth الداخلي المبني من رقم الهاتف.
       */
      const {
        error: authError,
      } = await supabaseAdmin.auth.admin.updateUserById(
        courier.user_id,
        {
          email,
          email_confirm: true,

          user_metadata: {
            full_name: data.name.trim(),
            phone,
            account_type: "courier",
          },
        },
      );

      if (authError) {
        throw new Error(
          authError.message,
        );
      }
    }

    return {
      ok: true as const,
      courierId: data.courierId,
    };
  });

/**
 * =========================================================
 * تفعيل / تعطيل عامل التوصيل
 * =========================================================
 */
export const setCourierActive = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    courierIdSchema.extend({
      active: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const supabaseAdmin = await getSupabaseAdmin();

    const {
      error,
    } = await supabaseAdmin
      .from("couriers")
      .update({
        is_active: data.active,
      })
      .eq("id", data.courierId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true as const,
    };
  });

/**
 * =========================================================
 * تفعيل / تعطيل حساب الدخول
 * =========================================================
 */
export const setCourierAccountEnabled =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .validator(
      courierIdSchema.extend({
        enabled: z.boolean(),
      }),
    )
    .handler(async ({ data, context }) => {
      await assertAdmin(context.userId);

      const supabaseAdmin =
        await getSupabaseAdmin();

      const {
        data: courier,
        error: courierError,
      } = await supabaseAdmin
        .from("couriers")
        .select("id,user_id")
        .eq("id", data.courierId)
        .maybeSingle();

      if (courierError) {
        throw new Error(
          courierError.message,
        );
      }

      if (!courier) {
        throw new Error(
          "عامل التوصيل غير موجود.",
        );
      }

      const {
        error: updateError,
      } = await supabaseAdmin
        .from("couriers")
        .update({
          account_enabled:
            data.enabled,
        })
        .eq(
          "id",
          data.courierId,
        );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }

      if (courier.user_id) {
        const {
          error: profileError,
        } = await supabaseAdmin
          .from("profiles")
          .update({
            is_disabled:
              !data.enabled,
          })
          .eq(
            "id",
            courier.user_id,
          );

        if (profileError) {
          throw new Error(
            profileError.message,
          );
        }
      }

      return {
        ok: true as const,
      };
    });

/**
 * =========================================================
 * تغيير كلمة المرور
 * =========================================================
 */
export const resetCourierPassword =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .validator(
      resetPasswordSchema,
    )
    .handler(async ({ data, context }) => {
      await assertAdmin(context.userId);

      const supabaseAdmin =
        await getSupabaseAdmin();

      const {
        data: courier,
        error,
      } = await supabaseAdmin
        .from("couriers")
        .select("id,user_id")
        .eq("id", data.courierId)
        .maybeSingle();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      if (!courier?.user_id) {
        throw new Error(
          "عامل التوصيل لا يملك حساب دخول.",
        );
      }

      const {
        error: passwordError,
      } = await supabaseAdmin.auth.admin.updateUserById(
        courier.user_id,
        {
          password: data.password,
        },
      );

      if (passwordError) {
        throw new Error(
          passwordError.message,
        );
      }

      return {
        ok: true as const,
      };
    });

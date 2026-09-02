import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isValidYemeniPhone,
  normalizeYemeniPhone,
  phoneToEmail,
} from "@/lib/phone";

export const ADMIN_EMAIL_DOMAIN = "shehara.app";

type ManagedAccountType =
  | "vendor"
  | "courier";

const managedAccountTypeSchema =
  z.enum([
    "vendor",
    "courier",
  ]);


/**
 * تحميل Supabase Admin Client على الخادم فقط.
 *
 * مهم:
 * لا نستورد client.server.ts في أعلى الملف،
 * لأن ملفات *.functions.ts يمكن أن تدخل ضمن bundle العميل.
 */
async function getSupabaseAdmin() {
  const {
    supabaseAdmin,
  } = await import(
    "@/integrations/supabase/client.server"
  );

  return supabaseAdmin;
}


/**
 * التحقق من أن المستخدم الحالي Admin.
 */
async function assertAdmin(
  userId: string,
) {
  const supabaseAdmin =
    await getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("user_roles")
    .select(
      "user_id,role",
    )
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "role",
      "admin",
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[Admin] Failed to verify admin role:",
      error,
    );

    throw new Error(
      "تعذر التحقق من صلاحيات الإدارة.",
    );
  }

  if (!data) {
    throw new Error(
      "غير مصرح لك بتنفيذ هذه العملية.",
    );
  }

  return true;
}


/**
 * =========================================================
 * إنشاء / تجهيز حساب الإدارة
 * =========================================================
 */

export const ensureAdminAccount =
  createServerFn({
    method: "POST",
  }).handler(
    async () => {
      const supabaseAdmin =
        await getSupabaseAdmin();

      const password =
        process.env[
          "ADMIN_INITIAL_PASSWORD"
        ];

      if (!password) {
        return {
          ok: false as const,
          reason:
            "missing_password",
        };
      }

      const email =
        `ameer@${ADMIN_EMAIL_DOMAIN}`;

      const {
        data: list,
        error: listError,
      } =
        await supabaseAdmin.auth.admin.listUsers(
          {
            page: 1,
            perPage: 200,
          },
        );

      if (listError) {
        return {
          ok: false as const,
          reason:
            listError.message,
        };
      }

      let userId =
        list?.users.find(
          (user) =>
            user.email?.toLowerCase() ===
            email.toLowerCase(),
        )?.id;

      if (!userId) {
        const {
          data: created,
          error,
        } =
          await supabaseAdmin.auth.admin.createUser(
            {
              email,
              password,
              email_confirm:
                true,
              user_metadata: {
                full_name:
                  "Ameer",
                username:
                  "Ameer",
                account_type:
                  "admin",
              },
            },
          );

        if (
          error ||
          !created.user
        ) {
          return {
            ok: false as const,
            reason:
              error?.message ??
              "create_failed",
          };
        }

        userId =
          created.user.id;
      }

      const {
        error:
          profileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              full_name:
                "Ameer",
            },
            {
              onConflict:
                "id",
            },
          );

      if (profileError) {
        return {
          ok: false as const,
          reason:
            profileError.message,
        };
      }

      const {
        error:
          roleError,
      } =
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            {
              user_id:
                userId,
              role: "admin",
            },
            {
              onConflict:
                "user_id,role",
            },
          );

      if (roleError) {
        return {
          ok: false as const,
          reason:
            roleError.message,
        };
      }

      return {
        ok: true as const,
        userId,
      };
    },
  );


/**
 * =========================================================
 * إنشاء حساب تاجر / عامل توصيل
 * =========================================================
 */

const createManagedAccountSchema =
  z.object({
    accountType:
      managedAccountTypeSchema,

    name: z
      .string()
      .trim()
      .min(
        2,
        "الاسم يجب أن يكون حرفين على الأقل.",
      )
      .max(
        100,
        "الاسم طويل جداً.",
      ),

    phone: z
      .string()
      .trim()
      .min(
        9,
        "رقم الهاتف غير صحيح.",
      )
      .max(
        20,
        "رقم الهاتف غير صحيح.",
      ),

    city: z
      .string()
      .trim()
      .min(
        1,
        "المدينة مطلوبة.",
      )
      .max(
        100,
        "اسم المدينة طويل جداً.",
      ),

    password: z
      .string()
      .min(
        8,
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      )
      .max(
        72,
        "كلمة المرور طويلة جداً.",
      ),

    recordId: z
      .string()
      .uuid()
      .optional()
      .nullable(),
  });


export const createManagedAccount =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      createManagedAccountSchema,
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        await assertAdmin(
          context.userId,
        );

        const supabaseAdmin =
          await getSupabaseAdmin();

        const phone =
          normalizeYemeniPhone(
            data.phone,
          );

        if (
          !isValidYemeniPhone(
            phone,
          )
        ) {
          throw new Error(
            "أدخل رقم هاتف يمني صحيح.",
          );
        }

        const email =
          phoneToEmail(phone);

        const {
          data: usersData,
          error: usersError,
        } =
          await supabaseAdmin.auth.admin.listUsers(
            {
              page: 1,
              perPage: 1000,
            },
          );

        if (usersError) {
          throw new Error(
            usersError.message,
          );
        }

        const existingUser =
          usersData.users.find(
            (user) =>
              user.email?.toLowerCase() ===
              email.toLowerCase(),
          );

        if (existingUser) {
          throw new Error(
            "رقم الهاتف مرتبط بحساب موجود مسبقاً.",
          );
        }

        const {
          data: created,
          error:
            createError,
        } =
          await supabaseAdmin.auth.admin.createUser(
            {
              email,
              password:
                data.password,
              email_confirm:
                true,
              user_metadata: {
                full_name:
                  data.name,
                phone,
                account_type:
                  data.accountType,
              },
            },
          );

        if (
          createError ||
          !created.user
        ) {
          throw new Error(
            createError?.message ??
              "تعذر إنشاء حساب المستخدم.",
          );
        }

        const userId =
          created.user.id;

        try {
          /**
           * Profile
           */
          const {
            error:
              profileError,
          } =
            await supabaseAdmin
              .from("profiles")
              .upsert(
                {
                  id: userId,
                  full_name:
                    data.name,
                  phone,
                  is_disabled:
                    false,
                },
                {
                  onConflict:
                    "id",
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
          const {
            error:
              roleError,
          } =
            await supabaseAdmin
              .from("user_roles")
              .insert({
                user_id:
                  userId,
                role:
                  data.accountType,
              });

          if (roleError) {
            throw new Error(
              roleError.message,
            );
          }

          /**
           * Vendor
           */
          if (
            data.accountType ===
            "vendor"
          ) {
            if (
              data.recordId
            ) {
              const {
                data:
                  vendor,
                error:
                  vendorError,
              } =
                await supabaseAdmin
                  .from(
                    "vendors",
                  )
                  .update({
                    user_id:
                      userId,
                    account_enabled:
                      true,
                    is_active:
                      true,
                    name:
                      data.name,
                    city:
                      data.city,
                  })
                  .eq(
                    "id",
                    data.recordId,
                  )
                  .select(
                    "id",
                  )
                  .maybeSingle();

              if (
                vendorError
              ) {
                throw new Error(
                  vendorError.message,
                );
              }

              if (!vendor) {
                throw new Error(
                  "لم يتم العثور على سجل التاجر.",
                );
              }

              return {
                ok: true as const,
                userId,
                recordId:
                  vendor.id,
                accountType:
                  "vendor" as const,
              };
            }

            const {
              data:
                vendor,
              error:
                vendorError,
            } =
              await supabaseAdmin
                .from(
                  "vendors",
                )
                .insert({
                  user_id:
                    userId,
                  account_enabled:
                    true,
                  is_active:
                    true,
                  name:
                    data.name,
                  city:
                    data.city,
                })
                .select(
                  "id",
                )
                .single();

            if (
              vendorError
            ) {
              throw new Error(
                vendorError.message,
              );
            }

            return {
              ok: true as const,
              userId,
              recordId:
                vendor.id,
              accountType:
                "vendor" as const,
            };
          }

          /**
           * Courier
           */
          if (
            data.accountType ===
            "courier"
          ) {
            if (
              data.recordId
            ) {
              const {
                data:
                  courier,
                error:
                  courierError,
              } =
                await supabaseAdmin
                  .from(
                    "couriers",
                  )
                  .update({
                    user_id:
                      userId,
                    account_enabled:
                      true,
                    is_active:
                      true,
                    name:
                      data.name,
                    phone,
                    city:
                      data.city,
                  })
                  .eq(
                    "id",
                    data.recordId,
                  )
                  .select(
                    "id",
                  )
                  .maybeSingle();

              if (
                courierError
              ) {
                throw new Error(
                  courierError.message,
                );
              }

              if (!courier) {
                throw new Error(
                  "لم يتم العثور على سجل عامل التوصيل.",
                );
              }

              return {
                ok: true as const,
                userId,
                recordId:
                  courier.id,
                accountType:
                  "courier" as const,
              };
            }

            const {
              data:
                courier,
              error:
                courierError,
            } =
              await supabaseAdmin
                .from(
                  "couriers",
                )
                .insert({
                  user_id:
                    userId,
                  account_enabled:
                    true,
                  is_active:
                    true,
                  name:
                    data.name,
                  phone,
                  city:
                    data.city,
                })
                .select(
                  "id",
                )
                .single();

            if (
              courierError
            ) {
              throw new Error(
                courierError.message,
              );
            }

            return {
              ok: true as const,
              userId,
              recordId:
                courier.id,
              accountType:
                "courier" as const,
            };
          }

          throw new Error(
            "نوع الحساب غير مدعوم.",
          );
        } catch (error) {
          await supabaseAdmin.auth.admin.deleteUser(
            userId,
          );

          throw error;
        }
      },
    );


/**
 * =========================================================
 * تفعيل / تعطيل الحساب
 * =========================================================
 */

const managedAccountStatusSchema =
  z.object({
    userId: z
      .string()
      .uuid(),

    disabled:
      z.boolean(),
  });


export const setManagedAccountDisabled =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      managedAccountStatusSchema,
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        await assertAdmin(
          context.userId,
        );

        const supabaseAdmin =
          await getSupabaseAdmin();

        const {
          error:
            profileError,
        } =
          await supabaseAdmin
            .from("profiles")
            .update({
              is_disabled:
                data.disabled,
            })
            .eq(
              "id",
              data.userId,
            );

        if (profileError) {
          throw new Error(
            profileError.message,
          );
        }

        const {
          error:
            authError,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            data.userId,
            {
              ban_duration:
                data.disabled
                  ? "876000h"
                  : "none",
            },
          );

        if (authError) {
          throw new Error(
            authError.message,
          );
        }

        await supabaseAdmin
          .from("vendors")
          .update({
            account_enabled:
              !data.disabled,
          })
          .eq(
            "user_id",
            data.userId,
          );

        await supabaseAdmin
          .from("couriers")
          .update({
            account_enabled:
              !data.disabled,
          })
          .eq(
            "user_id",
            data.userId,
          );

        return {
          ok: true as const,
          disabled:
            data.disabled,
        };
      },
    );


/**
 * =========================================================
 * إعادة تعيين كلمة المرور
 * =========================================================
 */

const resetPasswordSchema =
  z.object({
    userId: z
      .string()
      .uuid(),

    password: z
      .string()
      .min(
        8,
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      )
      .max(
        72,
        "كلمة المرور طويلة جداً.",
      ),
  });


export const resetManagedAccountPassword =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      resetPasswordSchema,
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        await assertAdmin(
          context.userId,
        );

        const supabaseAdmin =
          await getSupabaseAdmin();

        const {
          error,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            data.userId,
            {
              password:
                data.password,
              email_confirm:
                true,
            },
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          ok: true as const,
        };
      },
    );

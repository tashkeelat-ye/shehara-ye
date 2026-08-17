import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CreditCard,
  FileText,
  LayoutGrid,
  Image,
  ListOrdered,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Bell,
  Bike,
  MessagesSquare,
  Menu,
  X,
  ChevronLeft,
  Boxes,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { BrandLogo } from "@/components/brand-logo";

import {
  ensureAdminAccount,
  ADMIN_EMAIL_DOMAIN,
} from "@/lib/admin.functions";


export const Route =
  createFileRoute("/admin")({
    ssr: false,

    head: () => ({
      meta: [
        {
          title:
            "لوحة تحكم الإدارة | تشكيلات",
        },

        {
          name: "description",
          content:
            "لوحة تحكم إدارة متجر تشكيلات.",
        },

        {
          name: "robots",
          content:
            "noindex, nofollow",
        },

        {
          property: "og:title",
          content:
            "لوحة تحكم الإدارة | تشكيلات",
        },

        {
          property:
            "og:description",
          content:
            "منطقة إدارة متجر تشكيلات.",
        },
      ],
    }),

    component:
      AdminLayout,
  });


/*
 * =========================================================
 * قائمة أقسام لوحة التحكم
 * =========================================================
 */

const NAV = [
  {
    to: "/admin",
    label: "نظرة عامة",
    icon: LayoutGrid,
    exact: true,
  },

  {
    to: "/admin/products",
    label: "المنتجات",
    icon: Package,
  },

  /*
   * نظام المخزون
   */
  {
    to: "/admin/inventory",
    label: "إدارة المخزون",
    icon: Boxes,
  },

  {
    to: "/admin/categories",
    label: "الفئات والماركات",
    icon: LayoutGrid,
  },

  {
    to: "/admin/banners",
    label: "الإعلانات والعروض",
    icon: Image,
  },

  {
    to: "/admin/orders",
    label: "الطلبات",
    icon: ListOrdered,
  },

  {
    to: "/admin/payment-requests",
    label: "طلبات الدفع المعلّقة",
    icon: ReceiptText,
  },

  {
    to: "/admin/payments",
    label: "طرق الدفع",
    icon: CreditCard,
  },

  {
    to: "/admin/users",
    label: "المستخدمون والتجار",
    icon: Users,
  },

  {
    to: "/admin/couriers",
    label: "عمال التوصيل",
    icon: Bike,
  },

  {
    to: "/admin/support",
    label: "محادثات العملاء",
    icon: MessagesSquare,
  },

  {
    to: "/admin/notifications",
    label: "الإشعارات",
    icon: Bell,
  },

  {
    to: "/admin/content",
    label: "إدارة المحتوى",
    icon: FileText,
  },

  {
    to: "/admin/settings",
    label: "إعدادات المتجر",
    icon: Settings,
  },
] as const;


/*
 * =========================================================
 * التخطيط الرئيسي للوحة التحكم
 * =========================================================
 */

function AdminLayout() {
  const [
    state,
    setState,
  ] = useState<
    "loading" |
    "guest" |
    "denied" |
    "admin"
  >("loading");


  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] = useState(false);


  const navigate =
    useNavigate();


  const location =
    useLocation();


  /*
   * إغلاق القائمة عند الانتقال
   */
  useEffect(() => {
    setIsMobileMenuOpen(
      false,
    );
  }, [
    location.pathname,
  ]);


  /*
   * التحقق من صلاحيات الإدارة
   */
  const check =
    useCallback(
      async () => {
        const {
          data: userData,
        } =
          await supabase.auth.getUser();


        if (
          !userData.user
        ) {
          setState(
            "guest",
          );

          return;
        }


        const {
          data: roles,
        } =
          await supabase
            .from(
              "user_roles",
            )
            .select(
              "role",
            )
            .eq(
              "user_id",
              userData.user.id,
            )
            .eq(
              "role",
              "admin",
            )
            .returns<
              {
                role: string;
              }[]
            >();


        setState(
          roles &&
            roles.length >
              0
            ? "admin"
            : "denied",
        );
      },
      [],
    );


  useEffect(() => {
    void check();
  }, [check]);


  /*
   * شاشة التحقق
   */
  if (
    state ===
    "loading"
  ) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <p className="text-xs text-muted-foreground animate-pulse">
          جارٍ التحقق من الصلاحيات...
        </p>
      </div>
    );
  }


  /*
   * تسجيل الدخول
   */
  if (
    state !==
    "admin"
  ) {
    return (
      <AdminLogin
        denied={
          state ===
          "denied"
        }
        onSuccess={
          check
        }
      />
    );
  }


  return (
    <div
      className="min-h-screen overflow-x-hidden bg-background text-foreground dir-rtl"
    >
      {/* =====================================================
          الشريط العلوي
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">

          <div className="flex min-w-0 items-center gap-2.5">

            <button
              type="button"
              onClick={() =>
                setIsMobileMenuOpen(
                  !isMobileMenuOpen,
                )
              }
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary text-foreground transition-transform active:scale-95 md:hidden"
              aria-label="القائمة"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>


            <BrandLogo
              size={32}
            />


            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-none text-foreground">
                لوحة التحكم
              </p>

              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                تشكيلات
              </p>
            </div>

          </div>


          <div className="flex items-center gap-2">

            <Link
              to="/"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground"
            >
              المتجر
            </Link>


            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();

                setState(
                  "guest",
                );

                void navigate({
                  to: "/admin",
                  replace: true,
                });
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
            </button>

          </div>

        </div>
      </header>


      {/* =====================================================
          قائمة الهاتف
      ====================================================== */}

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() =>
            setIsMobileMenuOpen(
              false,
            )
          }
        >

          <div
            className="fixed inset-y-0 right-0 flex w-4/5 max-w-xs flex-col justify-between border-l border-border bg-card p-4 shadow-xl"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >

            <div className="space-y-4">

              <div className="flex items-center justify-between border-b border-border pb-3">

                <div className="flex items-center gap-2">

                  <BrandLogo
                    size={28}
                  />

                  <span className="text-xs font-bold">
                    أقسام اللوحة
                  </span>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setIsMobileMenuOpen(
                      false,
                    )
                  }
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>


              <nav className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto">

                {NAV.map(
                  (n) => (
                    <Link
                      key={
                        n.to
                      }
                      to={
                        n.to
                      }
                      activeOptions={{
                        exact:
                          "exact" in
                          n
                            ? n.exact
                            : false,
                      }}
                      activeProps={{
                        className:
                          "bg-primary text-primary-foreground font-semibold",
                      }}
                      inactiveProps={{
                        className:
                          "text-muted-foreground hover:bg-secondary",
                      }}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors"
                    >

                      <div className="flex items-center gap-2.5">

                        <n.icon className="h-4 w-4" />

                        <span>
                          {
                            n.label
                          }
                        </span>

                      </div>


                      <ChevronLeft className="h-3.5 w-3.5 opacity-50" />

                    </Link>
                  ),
                )}

              </nav>

            </div>


            <div className="border-t border-border pt-3">

              <p className="text-center text-[10px] text-muted-foreground">
                متجر تشكيلات © 2026
              </p>

            </div>

          </div>

        </div>
      ) : null}


      {/* =====================================================
          المحتوى الرئيسي
      ====================================================== */}

      <div className="mx-auto max-w-6xl px-3 py-4 md:flex md:gap-4 md:px-4">

        {/* ===================================================
            القائمة الجانبية للكمبيوتر
        ==================================================== */}

        <nav className="hidden md:block md:w-56 md:shrink-0">

          <div className="sticky top-20 space-y-1">

            {NAV.map(
              (n) => (
                <Link
                  key={
                    n.to
                  }
                  to={
                    n.to
                  }
                  activeOptions={{
                    exact:
                      "exact" in
                      n
                        ? n.exact
                        : false,
                  }}
                  activeProps={{
                    className:
                      "bg-primary text-primary-foreground font-semibold",
                  }}
                  inactiveProps={{
                    className:
                      "text-muted-foreground hover:bg-secondary",
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 text-xs transition-colors"
                >

                  <n.icon className="h-4 w-4" />

                  <span>
                    {
                      n.label
                    }
                  </span>

                </Link>
              ),
            )}

          </div>

        </nav>


        {/* ===================================================
            الصفحة الحالية
        ==================================================== */}

        <main className="min-w-0 flex-1 pb-16">
          <Outlet />
        </main>

      </div>

    </div>
  );
}


/*
 * =========================================================
 * شاشة تسجيل دخول الإدارة
 * =========================================================
 */

function AdminLogin({
  denied,
  onSuccess,
}: {
  denied: boolean;
  onSuccess: () => void;
}) {
  const [
    username,
    setUsername,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  const [
    busy,
    setBusy,
  ] = useState(false);


  useEffect(() => {
    void ensureAdminAccount({
      data: undefined,
    }).catch(
      () =>
        undefined,
    );
  }, []);


  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError(null);

    const clean =
      username
        .trim()
        .toLowerCase();


    if (
      !clean ||
      !password
    ) {
      setError(
        "أدخل اسم المستخدم وكلمة المرور",
      );

      return;
    }


    setBusy(true);


    const {
      data,
      error:
        signInError,
    } =
      await supabase.auth.signInWithPassword(
        {
          email: `${clean}@${ADMIN_EMAIL_DOMAIN}`,
          password,
        },
      );


    if (
      signInError ||
      !data.user
    ) {
      setBusy(false);

      setError(
        "اسم المستخدم أو كلمة المرور غير صحيحة",
      );

      return;
    }


    const {
      data: roles,
    } =
      await supabase
        .from(
          "user_roles",
        )
        .select(
          "role",
        )
        .eq(
          "user_id",
          data.user.id,
        )
        .eq(
          "role",
          "admin",
        )
        .returns<
          {
            role: string;
          }[]
        >();


    setBusy(false);


    if (
      !roles ||
      roles.length ===
        0
    ) {
      await supabase.auth.signOut();

      setError(
        "هذا الحساب لا يملك صلاحية الدخول للوحة التحكم",
      );

      return;
    }


    onSuccess();
  }


  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">

      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-card">

        <div className="flex flex-col items-center gap-2 text-center">

          <BrandLogo
            size={64}
          />

          <h1 className="text-base font-bold text-foreground">
            دخول الإدارة
          </h1>

          <p className="text-[11px] text-muted-foreground">
            تسجيل الدخول المخصص لوحدة التحكم لإدارة المتجر.
          </p>

        </div>


        {denied ? (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-[11px] text-destructive">
            حسابك الحالي ليس حساب إدارة. سجّل الخروج ثم ادخل ببيانات الإدارة.
          </p>
        ) : null}


        <form
          onSubmit={
            submit
          }
          className="mt-5 space-y-3"
        >

          <input
            value={
              username
            }
            onChange={(
              event,
            ) =>
              setUsername(
                event.target
                  .value,
              )
            }
            placeholder="اسم المستخدم"
            aria-label="اسم المستخدم"
            autoComplete="username"
            dir="ltr"
            maxLength={40}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
          />


          <input
            type="password"
            value={
              password
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event.target
                  .value,
              )
            }
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
            autoComplete="current-password"
            dir="ltr"
            maxLength={100}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
          />


          {error ? (
            <p className="text-center text-[11px] text-destructive">
              {error}
            </p>
          ) : null}


          <button
            type="submit"
            disabled={
              busy
            }
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-medium text-primary-foreground disabled:opacity-60"
          >

            <ShieldCheck className="h-4 w-4" />

            {busy
              ? "جارٍ الدخول..."
              : "دخول"}

          </button>

        </form>


        <Link
          to="/"
          className="mt-4 block text-center text-[11px] text-muted-foreground"
        >
          العودة إلى المتجر
        </Link>

      </div>

    </div>
  );
}

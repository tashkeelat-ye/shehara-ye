import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import {
  normalizeYemeniPhone,
  phoneToEmail,
} from "@/lib/phone";

export type AccountRole =
  | "customer"
  | "vendor"
  | "courier"
  | "admin";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  wallet_balance: number;
  preferred_currency: string;
  accepted_terms: boolean;
  accepted_order_policy: boolean;
  is_disabled: boolean;
};

type AuthAccountState = {
  role: AccountRole;
  roles: AccountRole[];
  accountEnabled: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  role: AccountRole | null;

  roles: AccountRole[];

  accountEnabled: boolean;

  loading: boolean;

  signUp: (args: {
    phone: string;
    fullName: string;
    password: string;
  }) => Promise<{
    error: string | null;
  }>;

  signIn: (args: {
    phone: string;
    password: string;
  }) => Promise<{
    error: string | null;
  }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;

  refreshAuthState: () => Promise<void>;
};

const AuthContext =
  createContext<
    AuthContextValue | null
  >(null);

const ROLE_PRIORITY: AccountRole[] = [
  "admin",
  "vendor",
  "courier",
  "customer",
];

function isAccountRole(
  value: unknown,
): value is AccountRole {
  return (
    value === "customer" ||
    value === "vendor" ||
    value === "courier" ||
    value === "admin"
  );
}

function resolvePrimaryRole(
  roles: AccountRole[],
): AccountRole {
  for (
    const role of ROLE_PRIORITY
  ) {
    if (
      roles.includes(role)
    ) {
      return role;
    }
  }

  return "customer";
}

function getAccountDisabledMessage(
  role: AccountRole,
): string {
  switch (role) {
    case "vendor":
      return "حساب التاجر معطل حالياً. يرجى التواصل مع الإدارة.";

    case "courier":
      return "حساب عامل التوصيل معطل حالياً. يرجى التواصل مع الإدارة.";

    case "admin":
      return "حساب الإدارة معطل حالياً. يرجى التواصل مع الإدارة.";

    default:
      return "حسابك معطل حالياً. يرجى التواصل مع الإدارة.";
  }
}

function detectDeviceType(
  userAgent: string,
): string {
  const ua =
    userAgent.toLowerCase();

  if (
    /ipad|tablet/.test(
      ua,
    )
  ) {
    return "Tablet";
  }

  if (
    /iphone|ipod/.test(
      ua,
    )
  ) {
    return "iPhone";
  }

  if (
    /android/.test(
      ua,
    )
  ) {
    return "Android";
  }

  if (
    /windows phone/.test(
      ua,
    )
  ) {
    return "Windows Phone";
  }

  if (
    /windows/.test(
      ua,
    )
  ) {
    return "Windows PC";
  }

  if (
    /macintosh|mac os/.test(
      ua,
    )
  ) {
    return "Mac";
  }

  if (
    /linux/.test(
      ua,
    )
  ) {
    return "Linux PC";
  }

  return "Unknown";
}

function detectOperatingSystem(
  userAgent: string,
): string {
  const ua =
    userAgent.toLowerCase();

  if (
    /iphone|ipad|ipod/.test(
      ua,
    )
  ) {
    return "iOS";
  }

  if (
    /android/.test(
      ua,
    )
  ) {
    return "Android";
  }

  if (
    /windows/.test(
      ua,
    )
  ) {
    return "Windows";
  }

  if (
    /mac os|macintosh/.test(
      ua,
    )
  ) {
    return "macOS";
  }

  if (
    /linux/.test(
      ua,
    )
  ) {
    return "Linux";
  }

  return "Unknown";
}

function detectBrowser(
  userAgent: string,
): string {
  const ua =
    userAgent.toLowerCase();

  if (
    /edg\//.test(
      ua,
    )
  ) {
    return "Microsoft Edge";
  }

  if (
    /opr\//.test(
      ua,
    )
  ) {
    return "Opera";
  }

  if (
    /samsungbrowser\//.test(
      ua,
    )
  ) {
    return "Samsung Internet";
  }

  if (
    /firefox\//.test(
      ua,
    )
  ) {
    return "Firefox";
  }

  if (
    /chrome\//.test(
      ua,
    ) &&
    !/edg\//.test(
      ua,
    )
  ) {
    return "Google Chrome";
  }

  if (
    /safari\//.test(
      ua,
    ) &&
    !/chrome\//.test(
      ua,
    )
  ) {
    return "Safari";
  }

  return "Unknown";
}

async function getGrantedGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  if (
    typeof window ===
    "undefined" ||
    !navigator.geolocation
  ) {
    return null;
  }

  try {
    if (
      "permissions" in
      navigator
    ) {
      const permission =
        await navigator.permissions.query(
          {
            name: "geolocation",
          },
        );

      if (
        permission.state !==
        "granted"
      ) {
        return null;
      }
    }

    return await new Promise(
      (resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude:
                position.coords
                  .latitude,

              longitude:
                position.coords
                  .longitude,

              accuracy:
                position.coords
                  .accuracy,
            });
          },
          () => {
            resolve(null);
          },
          {
            enableHighAccuracy:
              true,
            maximumAge:
              5 * 60 * 1000,
            timeout:
              10000,
          },
        );
      },
    );
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(
      null,
    );

  const [profile, setProfile] =
    useState<Profile | null>(
      null,
    );

  const [role, setRole] =
    useState<AccountRole | null>(
      null,
    );

  const [roles, setRoles] =
    useState<AccountRole[]>(
      [],
    );

  const [
    accountEnabled,
    setAccountEnabled,
  ] = useState(true);

  const [loading, setLoading] =
    useState(true);

  const loadAuthState =
    useCallback(
      async (
        userId: string,
      ): Promise<AuthAccountState> => {
        const [
          profileResult,
          rolesResult,
        ] =
          await Promise.all([
            supabase
              .from("profiles")
              .select(
                "id,full_name,phone,wallet_balance,preferred_currency,accepted_terms,accepted_order_policy,is_disabled",
              )
              .eq(
                "id",
                userId,
              )
              .maybeSingle<Profile>(),

            supabase
              .from("user_roles")
              .select(
                "role",
              )
              .eq(
                "user_id",
                userId,
              ),
          ]);

        const loadedProfile =
          profileResult.data ??
          null;

        if (
          profileResult.error
        ) {
          console.error(
            "[Auth] Failed to load profile:",
            profileResult.error,
          );
        }

        if (
          rolesResult.error
        ) {
          console.error(
            "[Auth] Failed to load roles:",
            rolesResult.error,
          );
        }

        setProfile(
          loadedProfile,
        );

        const loadedRoles: AccountRole[] =
          (rolesResult.data ??
            [])
            .map(
              (row) =>
                row.role,
            )
            .filter(
              isAccountRole,
            );

        const normalizedRoles =
          loadedRoles.length >
          0
            ? loadedRoles
            : ([
                "customer",
              ] as AccountRole[]);

        const primaryRole =
          resolvePrimaryRole(
            normalizedRoles,
          );

        setRoles(
          normalizedRoles,
        );

        setRole(
          primaryRole,
        );

        let enabled =
          !Boolean(
            loadedProfile?.is_disabled,
          );

        if (
          primaryRole ===
          "vendor"
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "vendors",
              )
              .select(
                "account_enabled,is_active",
              )
              .eq(
                "user_id",
                userId,
              )
              .maybeSingle();

          if (error) {
            console.error(
              "[Auth] Vendor state error:",
              error,
            );
          }

          if (data) {
            enabled =
              enabled &&
              data.account_enabled !==
                false &&
              data.is_active !==
                false;
          }
        }

        if (
          primaryRole ===
          "courier"
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "couriers",
              )
              .select(
                "account_enabled,is_active",
              )
              .eq(
                "user_id",
                userId,
              )
              .maybeSingle();

          if (error) {
            console.error(
              "[Auth] Courier state error:",
              error,
            );
          }

          if (data) {
            enabled =
              enabled &&
              data.account_enabled !==
                false &&
              data.is_active !==
                false;
          }
        }

        setAccountEnabled(
          enabled,
        );

        return {
          role:
            primaryRole,
          roles:
            normalizedRoles,
          accountEnabled:
            enabled,
        };
      },
      [],
    );

  const clearAuthState =
    useCallback(() => {
      setSession(null);
      setProfile(null);
      setRole(null);
      setRoles([]);
      setAccountEnabled(
        true,
      );
    }, []);

  useEffect(() => {
    let mounted =
      true;

    const {
      data: subscription,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          newSession,
        ) => {
          if (!mounted) {
            return;
          }

          setSession(
            newSession,
          );

          if (
            !newSession
          ) {
            clearAuthState();
          }
        },
      );

    void supabase.auth
      .getSession()
      .then(
        async ({
          data,
        }) => {
          if (!mounted) {
            return;
          }

          const currentSession =
            data.session ??
            null;

          setSession(
            currentSession,
          );

          if (
            !currentSession
              ?.user?.id
          ) {
            setLoading(
              false,
            );

            return;
          }

          try {
            await loadAuthState(
              currentSession
                .user.id,
            );
          } catch (error) {
            console.error(
              "[Auth] Initialization failed:",
              error,
            );
          } finally {
            if (mounted) {
              setLoading(
                false,
              );
            }
          }
        },
      )
      .catch(
        (error) => {
          console.error(
            "[Auth] Session restore failed:",
            error,
          );

          if (mounted) {
            setLoading(
              false,
            );
          }
        },
      );

    return () => {
      mounted = false;

      subscription.subscription.unsubscribe();
    };
  }, [
    clearAuthState,
    loadAuthState,
  ]);

  useEffect(() => {
    if (
      !session?.user?.id
    ) {
      return;
    }

    void loadAuthState(
      session.user.id,
    );
  }, [
    session?.user?.id,
    loadAuthState,
  ]);

  /*
   * =========================================================
   * REAL USER ACTIVITY TRACKING
   * =========================================================
   */

  useEffect(() => {
    const userId =
      session?.user?.id;

    if (
      !userId ||
      typeof window ===
        "undefined"
    ) {
      return;
    }

    let disposed = false;

    let timer:
      | number
      | undefined;

    async function sendActivity() {
      if (disposed) {
        return;
      }

      const userAgent =
        navigator.userAgent;

      const location =
        await getGrantedGeolocation();

      if (disposed) {
        return;
      }

      try {
        const {
          error,
        } =
          await supabase.functions.invoke(
            "track-user-activity",
            {
              body: {
                device_type:
                  detectDeviceType(
                    userAgent,
                  ),

                os_name:
                  detectOperatingSystem(
                    userAgent,
                  ),

                browser_name:
                  detectBrowser(
                    userAgent,
                  ),

                user_agent:
                  userAgent,

                latitude:
                  location?.latitude ??
                  null,

                longitude:
                  location?.longitude ??
                  null,

                accuracy:
                  location?.accuracy ??
                  null,

                path:
                  window.location.pathname,
              },
            },
          );

        if (error) {
          console.warn(
            "[Activity] Tracking failed:",
            error,
          );
        }
      } catch (error) {
        console.warn(
          "[Activity] Tracking error:",
          error,
        );
      }
    }

    void sendActivity();

    timer =
      window.setInterval(
        () => {
          void sendActivity();
        },
        60 * 1000,
      );

    const handleFocus =
      () => {
        void sendActivity();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void sendActivity();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      disposed = true;

      if (
        timer !==
        undefined
      ) {
        window.clearInterval(
          timer,
        );
      }

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [
    session?.user?.id,
  ]);

  const signUp =
    useCallback<
      AuthContextValue["signUp"]
    >(
      async ({
        phone,
        fullName,
        password,
      }) => {
        const normalizedPhone =
          normalizeYemeniPhone(
            phone,
          );

        const {
          error,
        } =
          await supabase.auth.signUp(
            {
              email:
                phoneToEmail(
                  normalizedPhone,
                ),

              password,

              options: {
                data: {
                  full_name:
                    fullName,

                  phone:
                    normalizedPhone,

                  account_type:
                    "customer",
                },

                ...(typeof window !==
                "undefined"
                  ? {
                      emailRedirectTo:
                        window.location.origin,
                    }
                  : {}),
              },
            },
          );

        if (error) {
          if (
            /already registered|already been registered/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "هذا الرقم مسجّل مسبقًا، يمكنك تسجيل الدخول.",
            };
          }

          return {
            error:
              error.message,
          };
        }

        const {
          error:
            signInError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                phoneToEmail(
                  normalizedPhone,
                ),

              password,
            },
          );

        if (signInError) {
          return {
            error:
              signInError.message,
          };
        }

        return {
          error: null,
        };
      },
      [],
    );

  const signIn =
    useCallback<
      AuthContextValue["signIn"]
    >(
      async ({
        phone,
        password,
      }) => {
        const normalizedPhone =
          normalizeYemeniPhone(
            phone,
          );

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                phoneToEmail(
                  normalizedPhone,
                ),

              password,
            },
          );

        if (error) {
          if (
            /invalid login credentials/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "رقم الهاتف أو كلمة المرور غير صحيحة.",
            };
          }

          if (
            /user is banned|banned/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "هذا الحساب معطل حالياً. يرجى التواصل مع الإدارة.",
            };
          }

          return {
            error:
              error.message,
          };
        }

        if (!data.user) {
          return {
            error:
              "تعذر إنشاء جلسة تسجيل الدخول.",
          };
        }

        const state =
          await loadAuthState(
            data.user.id,
          );

        if (
          !state.accountEnabled
        ) {
          await supabase.auth.signOut();

          clearAuthState();

          return {
            error:
              getAccountDisabledMessage(
                state.role,
              ),
          };
        }

        return {
          error: null,
        };
      },
      [
        clearAuthState,
        loadAuthState,
      ],
    );

  const signOut =
    useCallback(
      async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          clearAuthState();
        }
      },
      [clearAuthState],
    );

  const refreshAuthState =
    useCallback(
      async () => {
        if (
          !session?.user?.id
        ) {
          clearAuthState();

          return;
        }

        await loadAuthState(
          session.user.id,
        );
      },
      [
        clearAuthState,
        loadAuthState,
        session?.user?.id,
      ],
    );

  const refreshProfile =
    useCallback(
      async () => {
        await refreshAuthState();
      },
      [refreshAuthState],
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,

        user:
          session?.user ??
          null,

        profile,

        role,

        roles,

        accountEnabled,

        loading,

        signUp,

        signIn,

        signOut,

        refreshProfile,

        refreshAuthState,
      }),
      [
        session,
        profile,
        role,
        roles,
        accountEnabled,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshAuthState,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx =
    useContext(
      AuthContext,
    );

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return ctx;
}

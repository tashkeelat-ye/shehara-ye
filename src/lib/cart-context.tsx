import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchProductsByIds,
  type Product,
} from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY =
  "shehara_cart_v2";

export type CartLine = {
  id: string;
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
};

export type CartItem = CartLine & {
  product: Product;
};

type AddArgs = {
  productId: string;
  quantity?: number;
  size?: string | null;
  color?: string | null;
  openDrawer?: boolean;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  drawerOpen: boolean;

  setDrawerOpen: (
    open: boolean,
  ) => void;

  addItem: (
    args: AddArgs,
  ) => Promise<void>;

  updateQuantity: (
    lineId: string,
    quantity: number,
  ) => Promise<void>;

  removeItem: (
    lineId: string,
  ) => Promise<void>;

  clearCart: () => Promise<void>;

  refresh: () => Promise<void>;

  getItemQuantity: (
    productId: string,
    size?: string | null,
    color?: string | null,
  ) => number;
};

const CartContext =
  createContext<CartContextValue | null>(
    null,
  );

/* -------------------------------------------------- */
/* أدوات مساعدة                                       */
/* -------------------------------------------------- */

function lineKey(
  productId: string,
  size: string | null,
  color: string | null,
) {
  return [
    productId,
    size ?? "",
    color ?? "",
  ].join("|");
}

function localLineId(
  productId: string,
  size: string | null,
  color: string | null,
) {
  return `local_${lineKey(
    productId,
    size,
    color,
  )}`;
}

function readLocal(): CartLine[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(
      raw,
    ) as unknown;

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      (item): item is CartLine =>
        Boolean(
          item &&
            typeof item ===
              "object" &&
            typeof (
              item as CartLine
            ).product_id ===
              "string" &&
            Number.isFinite(
              Number(
                (
                  item as CartLine
                ).quantity,
              ),
            ),
        ),
    );
  } catch {
    return [];
  }
}

function writeLocal(
  lines: CartLine[],
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(lines),
    );
  } catch (error) {
    console.error(
      "[Shehara Cart] Failed to save local cart:",
      error,
    );
  }
}

function normalizeQuantity(
  quantity: number,
) {
  if (
    !Number.isFinite(quantity)
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(quantity),
  );
}

/* -------------------------------------------------- */
/* Provider                                           */
/* -------------------------------------------------- */

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } =
    useAuth();

  const [
    lines,
    setLines,
  ] = useState<CartLine[]>(
    [],
  );

  const [
    products,
    setProducts,
  ] = useState<
    Record<string, Product>
  >({});

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    drawerOpen,
    setDrawerOpen,
  ] = useState(false);

  const mergedFor =
    useRef<string | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ------------------------------------------------ */
  /* تحميل بيانات المنتجات                            */
  /* ------------------------------------------------ */

  const hydrateProducts =
    useCallback(
      async (
        current: CartLine[],
      ) => {
        const ids =
          Array.from(
            new Set(
              current.map(
                (line) =>
                  line.product_id,
              ),
            ),
          );

        if (
          ids.length === 0
        ) {
          if (
            mountedRef.current
          ) {
            setProducts({});
          }

          return;
        }

        try {
          const rows =
            await fetchProductsByIds(
              ids,
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setProducts(
            Object.fromEntries(
              rows.map(
                (product) => [
                  product.id,
                  product,
                ],
              ),
            ),
          );
        } catch (error) {
          console.warn(
            "[Shehara Cart] Could not hydrate products:",
            error,
          );
        }
      },
      [],
    );

  /* ------------------------------------------------ */
  /* تحميل سلة المستخدم من Supabase                   */
  /* ------------------------------------------------ */

  const loadDbCart =
    useCallback(
      async (
        userId: string,
      ): Promise<CartLine[]> => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase
          .from("cart_items")
          .select(
            "id,product_id,quantity,size,color",
          )
          .eq(
            "user_id",
            userId,
          )
          .order(
            "created_at",
            {
              ascending: true,
            },
          )
          .returns<CartLine[]>();

        if (error) {
          throw error;
        }

        return data ?? [];
      },
      [],
    );

  /* ------------------------------------------------ */
  /* تحديث السلة بالكامل                              */
  /* ------------------------------------------------ */

  const refresh =
    useCallback(
      async () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        setLoading(true);

        try {
          let next: CartLine[];

          const online =
            typeof navigator ===
              "undefined" ||
            navigator.onLine;

          if (
            user &&
            online
          ) {
            try {
              next =
                await loadDbCart(
                  user.id,
                );

              writeLocal(next);
            } catch (error) {
              console.warn(
                "[Shehara Cart] Cloud cart unavailable, using local cart:",
                error,
              );

              next =
                readLocal();
            }
          } else {
            next =
              readLocal();
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setLines(next);

          await hydrateProducts(
            next,
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        user,
        loadDbCart,
        hydrateProducts,
      ],
    );

  /* ------------------------------------------------ */
  /* دمج سلة الزائر بعد تسجيل الدخول                  */
  /* ------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    async function mergeGuestCart() {
      if (
        !user ||
        (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        )
      ) {
        mergedFor.current =
          null;

        await refresh();

        return;
      }

      if (
        mergedFor.current ===
        user.id
      ) {
        await refresh();

        return;
      }

      mergedFor.current =
        user.id;

      const local =
        readLocal();

      if (
        local.length === 0
      ) {
        await refresh();

        return;
      }

      try {
        const existing =
          await loadDbCart(
            user.id,
          );

        const cloudMap =
          new Map<
            string,
            CartLine
          >();

        for (
          const line of existing
        ) {
          cloudMap.set(
            lineKey(
              line.product_id,
              line.size,
              line.color,
            ),
            line,
          );
        }

        for (
          const localLine of local
        ) {
          const key =
            lineKey(
              localLine.product_id,
              localLine.size,
              localLine.color,
            );

          const existingLine =
            cloudMap.get(key);

          if (
            existingLine
          ) {
            const nextQuantity =
              Math.max(
                existingLine.quantity,
                localLine.quantity,
              );

            const {
              error,
            } = await supabase
              .from(
                "cart_items",
              )
              .update({
                quantity:
                  nextQuantity,
              })
              .eq(
                "id",
                existingLine.id,
              )
              .eq(
                "user_id",
                user.id,
              );

            if (error) {
              throw error;
            }
          } else {
            const {
              error,
            } = await supabase
              .from(
                "cart_items",
              )
              .insert({
                user_id:
                  user.id,
                product_id:
                  localLine.product_id,
                quantity:
                  normalizeQuantity(
                    localLine.quantity,
                  ),
                size:
                  localLine.size,
                color:
                  localLine.color,
              });

            if (error) {
              throw error;
            }
          }
        }

        writeLocal([]);
      } catch (error) {
        console.warn(
          "[Shehara Cart] Guest cart merge failed:",
          error,
        );
      }

      if (
        !cancelled
      ) {
        await refresh();
      }
    }

    void mergeGuestCart();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    refresh,
    loadDbCart,
  ]);

  /* ------------------------------------------------ */
  /* إضافة منتج                                      */
  /* ------------------------------------------------ */

  const addItem =
    useCallback<
      CartContextValue["addItem"]
    >(
      async ({
        productId,
        quantity = 1,
        size = null,
        color = null,
        openDrawer = false,
      }) => {
        const safeQuantity =
          normalizeQuantity(
            quantity,
          );

        if (
          openDrawer
        ) {
          setDrawerOpen(
            true,
          );
        }

        const key =
          lineKey(
            productId,
            size,
            color,
          );

        const online =
          typeof navigator ===
            "undefined" ||
          navigator.onLine;

        /* تحديث فوري للواجهة */
        setLines(
          (previous) => {
            const index =
              previous.findIndex(
                (line) =>
                  lineKey(
                    line.product_id,
                    line.size,
                    line.color,
                  ) === key,
              );

            if (
              index >= 0
            ) {
              const updated =
                [
                  ...previous,
                ];

              updated[index] = {
                ...updated[index],
                quantity:
                  updated[index]
                    .quantity +
                  safeQuantity,
              };

              return updated;
            }

            return [
              ...previous,
              {
                id: localLineId(
                  productId,
                  size,
                  color,
                ),
                product_id:
                  productId,
                quantity:
                  safeQuantity,
                size,
                color,
              },
            ];
          },
        );

        if (
          !user ||
          !online
        ) {
          const local =
            readLocal();

          const index =
            local.findIndex(
              (line) =>
                lineKey(
                  line.product_id,
                  line.size,
                  line.color,
                ) === key,
            );

          if (
            index >= 0
          ) {
            local[index] = {
              ...local[index],
              quantity:
                local[index]
                  .quantity +
                safeQuantity,
            };
          } else {
            local.push({
              id: localLineId(
                productId,
                size,
                color,
              ),
              product_id:
                productId,
              quantity:
                safeQuantity,
              size,
              color,
            });
          }

          writeLocal(local);

          await hydrateProducts(
            local,
          );

          return;
        }

        try {
          const dbCart =
            await loadDbCart(
              user.id,
            );

          const existing =
            dbCart.find(
              (line) =>
                lineKey(
                  line.product_id,
                  line.size,
                  line.color,
                ) === key,
            );

          if (
            existing
          ) {
            const {
              error,
            } = await supabase
              .from(
                "cart_items",
              )
              .update({
                quantity:
                  existing.quantity +
                  safeQuantity,
              })
              .eq(
                "id",
                existing.id,
              )
              .eq(
                "user_id",
                user.id,
              );

            if (error) {
              throw error;
            }
          } else {
            const {
              error,
            } = await supabase
              .from(
                "cart_items",
              )
              .insert({
                user_id:
                  user.id,
                product_id:
                  productId,
                quantity:
                  safeQuantity,
                size,
                color,
              });

            if (error) {
              throw error;
            }
          }

          await refresh();
        } catch (error) {
          console.error(
            "[Shehara Cart] Add item failed:",
            error,
          );

          /*
           * لا نحذف التحديث المتفائل مباشرة.
           * نحفظه محلياً حتى لا تضيع السلة
           * عند انقطاع الاتصال.
           */
          const local =
            readLocal();

          const index =
            local.findIndex(
              (line) =>
                lineKey(
                  line.product_id,
                  line.size,
                  line.color,
                ) === key,
            );

          if (
            index >= 0
          ) {
            local[index] = {
              ...local[index],
              quantity:
                local[index]
                  .quantity +
                safeQuantity,
            };
          } else {
            local.push({
              id: localLineId(
                productId,
                size,
                color,
              ),
              product_id:
                productId,
              quantity:
                safeQuantity,
              size,
              color,
            });
          }

          writeLocal(local);

          throw error;
        }
      },
      [
        user,
        loadDbCart,
        refresh,
        hydrateProducts,
      ],
    );

  /* ------------------------------------------------ */
  /* تعديل الكمية                                    */
  /* ------------------------------------------------ */

  const updateQuantity =
    useCallback<
      CartContextValue["updateQuantity"]
    >(
      async (
        lineId,
        quantity,
      ) => {
        if (
          quantity <= 0
        ) {
          await removeItem(
            lineId,
          );

          return;
        }

        const safeQuantity =
          normalizeQuantity(
            quantity,
          );

        const previous =
          lines;

        const target =
          previous.find(
            (line) =>
              line.id ===
              lineId,
          );

        if (
          !target
        ) {
          return;
        }

        /* تحديث فوري */
        setLines(
          (current) =>
            current.map(
              (line) =>
                line.id ===
                lineId
                  ? {
                      ...line,
                      quantity:
                        safeQuantity,
                    }
                  : line,
            ),
        );

        const online =
          typeof navigator ===
            "undefined" ||
          navigator.onLine;

        if (
          !user ||
          !online ||
          lineId.startsWith(
            "local_",
          )
        ) {
          const local =
            readLocal();

          const index =
            local.findIndex(
              (line) =>
                line.id ===
                lineId ||
                lineKey(
                  line.product_id,
                  line.size,
                  line.color,
                ) ===
                  lineKey(
                    target.product_id,
                    target.size,
                    target.color,
                  ),
            );

          if (
            index >= 0
          ) {
            local[index] = {
              ...local[index],
              quantity:
                safeQuantity,
            };

            writeLocal(
              local,
            );
          }

          return;
        }

        try {
          const {
            error,
          } = await supabase
            .from(
              "cart_items",
            )
            .update({
              quantity:
                safeQuantity,
            })
            .eq(
              "id",
              lineId,
            )
            .eq(
              "user_id",
              user.id,
            );

          if (error) {
            throw error;
          }

          await refresh();
        } catch (error) {
          console.error(
            "[Shehara Cart] Quantity update failed:",
            error,
          );

          setLines(
            previous,
          );

          throw error;
        }
      },
      [
        user,
        lines,
        refresh,
      ],
    );

  /* ------------------------------------------------ */
  /* حذف عنصر                                         */
  /* ------------------------------------------------ */

  const removeItem =
    useCallback<
      CartContextValue["removeItem"]
    >(
      async (
        lineId,
      ) => {
        const previous =
          lines;

        const target =
          previous.find(
            (line) =>
              line.id ===
              lineId,
          );

        if (
          !target
        ) {
          return;
        }

        /* تحديث فوري */
        setLines(
          (current) =>
            current.filter(
              (line) =>
                line.id !==
                lineId,
            ),
        );

        const online =
          typeof navigator ===
            "undefined" ||
          navigator.onLine;

        if (
          !user ||
          !online ||
          lineId.startsWith(
            "local_",
          )
        ) {
          const local =
            readLocal();

          const filtered =
            local.filter(
              (line) =>
                line.id !==
                  lineId &&
                lineKey(
                  line.product_id,
                  line.size,
                  line.color,
                ) !==
                  lineKey(
                    target.product_id,
                    target.size,
                    target.color,
                  ),
            );

          writeLocal(
            filtered,
          );

          return;
        }

        try {
          const {
            error,
          } = await supabase
            .from(
              "cart_items",
            )
            .delete()
            .eq(
              "id",
              lineId,
            )
            .eq(
              "user_id",
              user.id,
            );

          if (error) {
            throw error;
          }

          await refresh();
        } catch (error) {
          console.error(
            "[Shehara Cart] Remove item failed:",
            error,
          );

          setLines(
            previous,
          );

          throw error;
        }
      },
      [
        user,
        lines,
        refresh,
      ],
    );

  /* ------------------------------------------------ */
  /* تفريغ السلة                                     */
  /* ------------------------------------------------ */

  const clearCart =
    useCallback(
      async () => {
        const previous =
          lines;

        setLines([]);

        writeLocal([]);

        const online =
          typeof navigator ===
            "undefined" ||
          navigator.onLine;

        if (
          !user ||
          !online
        ) {
          setProducts({});
          return;
        }

        try {
          const {
            error,
          } = await supabase
            .from(
              "cart_items",
            )
            .delete()
            .eq(
              "user_id",
              user.id,
            );

          if (error) {
            throw error;
          }

          setProducts({});
        } catch (error) {
          console.error(
            "[Shehara Cart] Clear cart failed:",
            error,
          );

          setLines(
            previous,
          );

          writeLocal(
            previous,
          );

          throw error;
        }
      },
      [
        user,
        lines,
      ],
    );

  /* ------------------------------------------------ */
  /* كمية منتج محدد                                  */
  /* ------------------------------------------------ */

  const getItemQuantity =
    useCallback(
      (
        productId: string,
        size: string | null =
          null,
        color: string | null =
          null,
      ) => {
        const key =
          lineKey(
            productId,
            size,
            color,
          );

        const found =
          lines.find(
            (line) =>
              lineKey(
                line.product_id,
                line.size,
                line.color,
              ) === key,
          );

        return found?.quantity ??
          0;
      },
      [lines],
    );

  /* ------------------------------------------------ */
  /* عناصر السلة مع المنتجات                         */
  /* ------------------------------------------------ */

  const items =
    useMemo<CartItem[]>(
      () =>
        lines
          .map((line) => {
            const product =
              products[
                line.product_id
              ];

            if (!product) {
              return null;
            }

            return {
              ...line,
              product,
            };
          })
          .filter(
            (
              item,
            ): item is CartItem =>
              item !== null,
          ),
      [
        lines,
        products,
      ],
    );

  /* ------------------------------------------------ */
  /* القيمة النهائية للسياق                          */
  /* ------------------------------------------------ */

  const value =
    useMemo<CartContextValue>(
      () => ({
        items,

        count:
          lines.reduce(
            (
              sum,
              line,
            ) =>
              sum +
              line.quantity,
            0,
          ),

        total:
          items.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              Number(
                item.product.price ??
                  0,
              ) *
                item.quantity,
            0,
          ),

        loading,

        drawerOpen,

        setDrawerOpen,

        addItem,

        updateQuantity,

        removeItem,

        clearCart,

        refresh,

        getItemQuantity,
      }),
      [
        items,
        lines,
        loading,
        drawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refresh,
        getItemQuantity,
      ],
    );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

/* -------------------------------------------------- */
/* Hook                                               */
/* -------------------------------------------------- */

export function useCart(): CartContextValue {
  const context =
    useContext(
      CartContext,
    );

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return context;
}

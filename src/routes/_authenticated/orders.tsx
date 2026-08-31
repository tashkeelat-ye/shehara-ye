import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronLeft,
  Clock3,
  FileText,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  SiteHeader,
} from "@/components/site-header";

import {
  BottomNav,
} from "@/components/bottom-nav";

import {
  useFormatPrice,
} from "@/lib/currency-context";

import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
} from "@/lib/store";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  InvoiceView,
} from "@/components/InvoiceView";


export const Route =
  createFileRoute(
    "/_authenticated/orders",
  )({
    head: () => ({
      meta: [
        {
          title:
            "طلباتي | شهارة",
        },
        {
          name:
            "description",
          content:
            "تابع طلباتك ومشترياتك من تطبيق شهارة.",
        },
      ],
    }),

    component:
      OrdersPage,
  });


type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};


type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method_code: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district: string;
  shipping_details: string;
  created_at: string;
  order_items:
    OrderItem[] | null;
  invoices:
    {
      invoice_number: string;
    }[] | null;
};


const statusIcon: Record<
  string,
  typeof Package
> = {
  pending:
    Clock3,

  confirmed:
    Package,

  processing:
    Package,

  shipped:
    Truck,

  delivered:
    ShoppingBag,

  cancelled:
    Clock3,
};


const statusClasses: Record<
  string,
  string
> = {
  pending:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300",

  confirmed:
    "bg-primary/10 text-primary",

  processing:
    "bg-primary/10 text-primary",

  shipped:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300",

  delivered:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",

  cancelled:
    "bg-destructive/10 text-destructive",
};


function OrdersPage() {
  const formatPrice =
    useFormatPrice();


  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>(
      [],
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    filter,
    setFilter,
  ] =
    useState(
      "all",
    );


  const loadOrders =
    useCallback(
      async (
        silent = false,
      ) => {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(
            true,
          );
        }

        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "orders",
              )
              .select(
                [
                  "id",
                  "order_number",
                  "status",
                  "payment_status",
                  "payment_method_code",
                  "subtotal",
                  "delivery_fee",
                  "total",
                  "shipping_name",
                  "shipping_phone",
                  "shipping_city",
                  "shipping_district",
                  "shipping_details",
                  "created_at",
                  "order_items(id,product_name,quantity,unit_price)",
                  "invoices(invoice_number)",
                ].join(
                  ",",
                ),
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .returns<
                Order[]
              >();


          if (error) {
            throw error;
          }


          setOrders(
            data ?? [],
          );
        } catch (
          error
        ) {
          console.error(
            "[Shehara Orders]",
            error,
          );

          setOrders(
            [],
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    void loadOrders();
  }, [
    loadOrders,
  ]);


  const filteredOrders =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();


      return orders.filter(
        (order) => {
          const matchesFilter =
            filter ===
              "all" ||
            order.status ===
              filter;


          if (
            !matchesFilter
          ) {
            return false;
          }


          if (
            !normalized
          ) {
            return true;
          }


          return (
            order.order_number
              .toLowerCase()
              .includes(
                normalized,
              ) ||
            order.shipping_name
              .toLowerCase()
              .includes(
                normalized,
              )
          );
        },
      );
    }, [
      orders,
      search,
      filter,
    ]);


  const activeCount =
    orders.filter(
      (order) =>
        ![
          "delivered",
          "cancelled",
        ].includes(
          order.status,
        ),
    ).length;


  const deliveredCount =
    orders.filter(
      (order) =>
        order.status ===
        "delivered",
    ).length;


  function getStatusLabel(
    status: string,
  ) {
    return (
      ORDER_STATUS_LABELS[
        status
      ] ??
      status
    );
  }


  function getPaymentLabel(
    status: string,
  ) {
    return (
      PAYMENT_STATUS_LABELS[
        status
      ] ??
      status
    );
  }


  return (
    <div
      dir="rtl"
      className="
        min-h-[100dvh]
        bg-background
        pb-28
      "
    >
      <SiteHeader />


      <main
        className="
          mx-auto
          w-full
          max-w-4xl
          px-4
          py-5
        "
      >

        {/* -------------------------------- */}
        {/* رأس الصفحة */}
        {/* -------------------------------- */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-bold
                text-primary
              "
            >
              حسابي
            </p>

            <h1
              className="
                mt-1
                text-xl
                font-black
                text-foreground
              "
            >
              طلباتي
            </h1>

            <p
              className="
                mt-1
                text-[10px]
                text-muted-foreground
              "
            >
              جميع مشترياتك في مكان
              واحد.
            </p>
          </div>


          <button
            type="button"
            onClick={() =>
              void loadOrders(
                true,
              )
            }
            disabled={
              refreshing
            }
            aria-label="تحديث الطلبات"
            className="
              grid
              h-11
              w-11
              place-items-center
              rounded-2xl
              border
              border-border
              bg-card
              text-muted-foreground
              transition
              active:scale-95
              disabled:opacity-50
            "
          >
            <RefreshCw
              className={`
                h-4
                w-4
                ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              `}
            />
          </button>
        </div>


        {/* -------------------------------- */}
        {/* الإحصائيات */}
        {/* -------------------------------- */}

        {!loading &&
        orders.length > 0 ? (
          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-2
              sm:grid-cols-3
            "
          >
            <div
              className="
                rounded-2xl
                border
                border-border/70
                bg-card
                p-3
              "
            >
              <p
                className="
                  text-[9px]
                  text-muted-foreground
                "
              >
                إجمالي الطلبات
              </p>

              <p
                className="
                  mt-1
                  text-lg
                  font-black
                  text-primary
                "
              >
                {orders.length.toLocaleString(
                  "ar-YE",
                )}
              </p>
            </div>


            <div
              className="
                rounded-2xl
                border
                border-border/70
                bg-card
                p-3
              "
            >
              <p
                className="
                  text-[9px]
                  text-muted-foreground
                "
              >
                طلبات نشطة
              </p>

              <p
                className="
                  mt-1
                  text-lg
                  font-black
                  text-primary
                "
              >
                {activeCount.toLocaleString(
                  "ar-YE",
                )}
              </p>
            </div>


            <div
              className="
                col-span-2
                rounded-2xl
                border
                border-border/70
                bg-card
                p-3
                sm:col-span-1
              "
            >
              <p
                className="
                  text-[9px]
                  text-muted-foreground
                "
              >
                تم تسليمها
              </p>

              <p
                className="
                  mt-1
                  text-lg
                  font-black
                  text-primary
                "
              >
                {deliveredCount.toLocaleString(
                  "ar-YE",
                )}
              </p>
            </div>
          </div>
        ) : null}


        {/* -------------------------------- */}
        {/* البحث */}
        {/* -------------------------------- */}

        {!loading &&
        orders.length > 0 ? (
          <>
            <div
              className="
                relative
                mt-4
              "
            >
              <Search
                className="
                  absolute
                  right-4
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <input
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="ابحث برقم الطلب أو الاسم"
                className="
                  h-12
                  w-full
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  pe-11
                  ps-4
                  text-xs
                  outline-none
                  transition
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/10
                "
              />
            </div>


            {/* الفلاتر */}

            <div
              className="
                mt-3
                flex
                gap-2
                overflow-x-auto
                pb-1
                scrollbar-none
              "
            >
              {[
                {
                  value:
                    "all",
                  label:
                    "الكل",
                },
                {
                  value:
                    "pending",
                  label:
                    "قيد الانتظار",
                },
                {
                  value:
                    "processing",
                  label:
                    "قيد التجهيز",
                },
                {
                  value:
                    "shipped",
                  label:
                    "في الطريق",
                },
                {
                  value:
                    "delivered",
                  label:
                    "تم التسليم",
                },
                {
                  value:
                    "cancelled",
                  label:
                    "ملغي",
                },
              ].map(
                (item) => (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    onClick={() =>
                      setFilter(
                        item.value,
                      )
                    }
                    className={`
                      shrink-0
                      rounded-full
                      px-4
                      py-2
                      text-[9px]
                      font-black
                      transition
                      ${
                        filter ===
                        item.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground border border-border"
                      }
                    `}
                  >
                    {
                      item.label
                    }
                  </button>
                ),
              )}
            </div>
          </>
        ) : null}


        {/* -------------------------------- */}
        {/* التحميل */}
        {/* -------------------------------- */}

        {loading ? (
          <div
            className="
              mt-5
              space-y-3
            "
          >
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="
                    h-40
                    animate-pulse
                    rounded-[1.5rem]
                    bg-muted
                  "
                />
              ),
            )}
          </div>
        ) : null}


        {/* -------------------------------- */}
        {/* لا توجد طلبات */}
        {/* -------------------------------- */}

        {!loading &&
        orders.length ===
          0 ? (
          <div
            className="
              mt-5
              flex
              min-h-[55vh]
              flex-col
              items-center
              justify-center
              rounded-[1.5rem]
              border
              border-border/70
              bg-card
              px-6
              text-center
            "
          >
            <div
              className="
                grid
                h-20
                w-20
                place-items-center
                rounded-[1.75rem]
                bg-primary/10
                text-primary
              "
            >
              <ShoppingBag
                className="h-9 w-9"
              />
            </div>

            <h2
              className="
                mt-5
                text-base
                font-black
              "
            >
              لم تقم بأي طلب بعد
            </h2>

            <p
              className="
                mt-2
                max-w-xs
                text-[10px]
                leading-6
                text-muted-foreground
              "
            >
              اكتشف المنتجات والعروض
              وأضف ما يعجبك إلى
              سلتك.
            </p>

            <Link
              to="/products"
              className="
                mt-5
                flex
                min-h-12
                items-center
                gap-2
                rounded-2xl
                bg-primary
                px-7
                text-[10px]
                font-black
                text-primary-foreground
              "
            >
              ابدأ التسوق

              <ChevronLeft
                className="h-4 w-4"
              />
            </Link>
          </div>
        ) : null}


        {/* -------------------------------- */}
        {/* نتيجة البحث فارغة */}
        {/* -------------------------------- */}

        {!loading &&
        orders.length > 0 &&
        filteredOrders.length ===
          0 ? (
          <div
            className="
              mt-5
              rounded-[1.5rem]
              border
              border-border/70
              bg-card
              p-8
              text-center
            "
          >
            <Search
              className="
                mx-auto
                h-7
                w-7
                text-muted-foreground
              "
            />

            <p
              className="
                mt-3
                text-xs
                font-black
              "
            >
              لا توجد نتائج
            </p>

            <p
              className="
                mt-1
                text-[10px]
                text-muted-foreground
              "
            >
              جرّب تغيير البحث أو
              الفلتر.
            </p>
          </div>
        ) : null}


        {/* -------------------------------- */}
        {/* الطلبات */}
        {/* -------------------------------- */}

        {!loading &&
        filteredOrders.length >
          0 ? (
          <ul
            className="
              mt-5
              space-y-3
            "
          >
            {filteredOrders.map(
              (order) => {
                const Icon =
                  statusIcon[
                    order.status
                  ] ??
                  Package;


                const statusClass =
                  statusClasses[
                    order.status
                  ] ??
                  "bg-primary/10 text-primary";


                const items =
                  order.order_items ??
                  [];


                const invoiceNumber =
                  order
                    .invoices?.[0]
                    ?.invoice_number ??
                  `INV-${order.order_number.replace(
                    /\D/g,
                    "",
                  )}`;


                return (
                  <li
                    key={
                      order.id
                    }
                    className="
                      overflow-hidden
                      rounded-[1.5rem]
                      border
                      border-border/70
                      bg-card
                    "
                  >

                    {/* رأس الطلب */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        border-b
                        border-border/70
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-3
                        "
                      >
                        <div
                          className="
                            grid
                            h-10
                            w-10
                            shrink-0
                            place-items-center
                            rounded-xl
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div
                          className="
                            min-w-0
                          "
                        >
                          <p
                            dir="ltr"
                            className="
                              truncate
                              text-xs
                              font-black
                              font-mono
                            "
                          >
                            {
                              order.order_number
                            }
                          </p>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              text-muted-foreground
                            "
                          >
                            {formatDate(
                              order.created_at,
                            )}
                          </p>
                        </div>
                      </div>


                      <span
                        className={`
                          shrink-0
                          rounded-full
                          px-2.5
                          py-1
                          text-[9px]
                          font-black
                          ${statusClass}
                        `}
                      >
                        {
                          getStatusLabel(
                            order.status,
                          )
                        }
                      </span>
                    </div>


                    {/* المنتجات */}

                    <div
                      className="
                        divide-y
                        divide-border/70
                      "
                    >
                      {items
                        .slice(
                          0,
                          3,
                        )
                        .map(
                          (
                            item,
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="
                                flex
                                items-center
                                justify-between
                                gap-3
                                px-4
                                py-3
                              "
                            >
                              <p
                                className="
                                  min-w-0
                                  flex-1
                                  truncate
                                  text-[10px]
                                  font-bold
                                "
                              >
                                {
                                  item.product_name
                                }

                                {" × "}

                                {item.quantity.toLocaleString(
                                  "ar-YE",
                                )}
                              </p>

                              <span
                                className="
                                  shrink-0
                                  text-[10px]
                                  font-black
                                  text-primary
                                "
                              >
                                {formatPrice(
                                  Number(
                                    item.unit_price,
                                  ) *
                                    item.quantity,
                                )}
                              </span>
                            </div>
                          ),
                        )}


                      {items.length >
                      3 ? (
                        <p
                          className="
                            px-4
                            py-2
                            text-[9px]
                            text-muted-foreground
                          "
                        >
                          +

                          {(
                            items.length -
                            3
                          ).toLocaleString(
                            "ar-YE",
                          )}

                          {" "}

                          منتجات أخرى
                        </p>
                      ) : null}
                    </div>


                    {/* الملخص */}

                    <div
                      className="
                        border-t
                        border-border/70
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[9px]
                              text-muted-foreground
                            "
                          >
                            الدفع
                          </p>

                          <p
                            className="
                              mt-1
                              text-[10px]
                              font-bold
                            "
                          >
                            {
                              getPaymentLabel(
                                order.payment_status,
                              )
                            }
                          </p>
                        </div>


                        <div
                          className="
                            text-start
                          "
                        >
                          <p
                            className="
                              text-[9px]
                              text-muted-foreground
                            "
                          >
                            الإجمالي
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-black
                              text-primary
                            "
                          >
                            {formatPrice(
                              order.total,
                            )}
                          </p>
                        </div>
                      </div>


                      {/* أزرار */}

                      <div
                        className="
                          mt-4
                          grid
                          grid-cols-2
                          gap-2
                        "
                      >
                        <Link
                          to="/order/$id"
                          params={{
                            id: order.id,
                          }}
                          className="
                            flex
                            min-h-11
                            items-center
                            justify-center
                            gap-1.5
                            rounded-2xl
                            bg-primary
                            text-[10px]
                            font-black
                            text-primary-foreground
                          "
                        >
                          تفاصيل الطلب

                          <ChevronLeft
                            className="h-3.5 w-3.5"
                          />
                        </Link>


                        <Dialog>
                          <DialogTrigger
                            asChild
                          >
                            <button
                              type="button"
                              className="
                                flex
                                min-h-11
                                items-center
                                justify-center
                                gap-1.5
                                rounded-2xl
                                border
                                border-border
                                bg-background
                                text-[10px]
                                font-black
                              "
                            >
                              <FileText
                                className="
                                  h-3.5
                                  w-3.5
                                "
                              />

                              الفاتورة
                            </button>
                          </DialogTrigger>

                          <DialogContent
                            className="
                              max-h-[90vh]
                              max-w-4xl
                              overflow-y-auto
                              rounded-3xl
                              border-none
                              bg-white
                              p-2
                              shadow-2xl
                              sm:p-6
                            "
                          >
                            <InvoiceView
                              order={{
                                invoiceNumber,
                                invoiceDate:
                                  new Date(
                                    order.created_at,
                                  ).toLocaleDateString(
                                    "ar-YE",
                                  ),
                                orderNumber:
                                  order.order_number,

                                customerDetails:
                                  {
                                    name:
                                      order.shipping_name,

                                    phone:
                                      order.shipping_phone,

                                    address:
                                      `${order.shipping_city} - ${order.shipping_district} (${order.shipping_details})`,

                                    paymentMethod:
                                      getPaymentLabel(
                                        order.payment_status,
                                      ),

                                    currency:
                                      "ريال يمني (YER)",
                                  },

                                items:
                                  items.map(
                                    (
                                      item,
                                    ) => ({
                                      id:
                                        item.id,

                                      title:
                                        item.product_name,

                                      quantity:
                                        item.quantity,

                                      price:
                                        item.unit_price,

                                      image:
                                        "/logo.png",
                                    }),
                                  ),

                                subtotal:
                                  order.subtotal,

                                shippingFee:
                                  order.delivery_fee,

                                total:
                                  order.total,
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        ) : null}
      </main>


      <BottomNav />
    </div>
  );
}

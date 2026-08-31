import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import {
  toast,
} from "sonner";

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
    "/_authenticated/order/$id",
  )({
    head: () => ({
      meta: [
        {
          title:
            "تفاصيل الطلب | شهارة",
        },
      ],
    }),

    component:
      OrderDetailsPage,
  });


type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
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
  shipping_landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items:
    OrderItem[] | null;
  couriers:
    {
      name: string;
      phone: string;
    } | null;
  invoices:
    {
      invoice_number: string;
    }[] | null;
};


const timeline = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];


const statusIcons: Record<
  string,
  typeof Clock3
> = {
  pending:
    Clock3,

  confirmed:
    Check,

  processing:
    Package,

  shipped:
    Truck,

  delivered:
    ShoppingBag,
};


function OrderDetailsPage() {
  const {
    id,
  } = Route.useParams();


  const navigate =
    useNavigate();


  const formatPrice =
    useFormatPrice();


  const [
    order,
    setOrder,
  ] =
    useState<Order | null>(
      null,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    cancelling,
    setCancelling,
  ] =
    useState(false);


  async function loadOrder() {
    setLoading(true);

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
              "shipping_landmark",
              "latitude",
              "longitude",
              "notes",
              "created_at",
              "updated_at",
              "order_items(id,product_name,product_image,quantity,unit_price,size,color)",
              "couriers(name,phone)",
              "invoices(invoice_number)",
            ].join(
              ",",
            ),
          )
          .eq(
            "id",
            id,
          )
          .maybeSingle();


      if (error) {
        throw error;
      }


      if (!data) {
        setOrder(
          null,
        );

        return;
      }


      setOrder(
        data as Order,
      );
    } catch (
      error
    ) {
      console.error(
        "[Shehara Order Details]",
        error,
      );

      toast.error(
        "تعذر تحميل تفاصيل الطلب.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(() => {
    void loadOrder();
  }, [
    id,
  ]);


  async function cancelOrder() {
    if (
      !order ||
      cancelling
    ) {
      return;
    }


    const allowed =
      [
        "pending",
        "confirmed",
      ].includes(
        order.status,
      );


    if (!allowed) {
      toast.error(
        "لا يمكن إلغاء الطلب في هذه المرحلة.",
      );

      return;
    }


    const confirmed =
      window.confirm(
        "هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟",
      );


    if (!confirmed) {
      return;
    }


    setCancelling(
      true,
    );


    try {
      const {
        error,
      } =
        await supabase
          .from(
            "orders",
          )
          .update({
            status:
              "cancelled",
          })
          .eq(
            "id",
            order.id,
          )
          .in(
            "status",
            [
              "pending",
              "confirmed",
            ],
          );


      if (error) {
        throw error;
      }


      toast.success(
        "تم إلغاء الطلب.",
      );


      await loadOrder();
    } catch (
      error
    ) {
      console.error(
        "[Shehara Cancel Order]",
        error,
      );

      toast.error(
        "تعذر إلغاء الطلب.",
      );
    } finally {
      setCancelling(
        false,
      );
    }
  }


  if (loading) {
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
            max-w-3xl
            px-4
            py-6
          "
        >
          <div
            className="
              h-7
              w-40
              animate-pulse
              rounded-lg
              bg-muted
            "
          />

          <div
            className="
              mt-5
              h-52
              animate-pulse
              rounded-[1.5rem]
              bg-muted
            "
          />

          <div
            className="
              mt-3
              h-44
              animate-pulse
              rounded-[1.5rem]
              bg-muted
            "
          />
        </main>

        <BottomNav />
      </div>
    );
  }


  if (!order) {
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
            flex
            min-h-[65vh]
            max-w-xl
            flex-col
            items-center
            justify-center
            px-5
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
              bg-destructive/10
              text-destructive
            "
          >
            <XCircle
              className="h-9 w-9"
            />
          </div>

          <h1
            className="
              mt-5
              text-base
              font-black
            "
          >
            الطلب غير موجود
          </h1>

          <p
            className="
              mt-2
              text-[10px]
              text-muted-foreground
            "
          >
            ربما تم حذف الطلب أو أن
            الرابط غير صحيح.
          </p>

          <Link
            to="/orders"
            className="
              mt-5
              flex
              min-h-11
              items-center
              gap-2
              rounded-2xl
              bg-primary
              px-6
              text-[10px]
              font-black
              text-primary-foreground
            "
          >
            العودة إلى طلباتي

            <ArrowRight
              className="h-4 w-4"
            />
          </Link>
        </main>

        <BottomNav />
      </div>
    );
  }


  const items =
    order.order_items ??
    [];


  const currentIndex =
    timeline.indexOf(
      order.status,
    );


  const invoiceNumber =
    order
      .invoices?.[0]
      ?.invoice_number ??
    `INV-${order.order_number.replace(
      /\D/g,
      "",
    )}`;


  const canCancel =
    [
      "pending",
      "confirmed",
    ].includes(
      order.status,
    );


  const statusLabel =
    ORDER_STATUS_LABELS[
      order.status
    ] ??
    order.status;


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
          max-w-3xl
          px-4
          py-5
        "
      >

        {/* -------------------------------- */}
        {/* الرأس */}
        {/* -------------------------------- */}

        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/orders",
              })
            }
            className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-xl
              border
              border-border
              bg-card
            "
            aria-label="العودة"
          >
            <ArrowRight
              className="h-4 w-4"
            />
          </button>


          <div
            className="
              min-w-0
              flex-1
            "
          >
            <p
              className="
                text-[9px]
                font-bold
                text-primary
              "
            >
              تفاصيل الطلب
            </p>

            <h1
              dir="ltr"
              className="
                mt-1
                truncate
                text-base
                font-black
                font-mono
              "
            >
              {
                order.order_number
              }
            </h1>
          </div>


          <button
            type="button"
            onClick={() =>
              void loadOrder()
            }
            className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-xl
              border
              border-border
              bg-card
              text-muted-foreground
            "
            aria-label="تحديث"
          >
            <RefreshCw
              className="h-4 w-4"
            />
          </button>
        </div>


        {/* -------------------------------- */}
        {/* الحالة الحالية */}
        {/* -------------------------------- */}

        <section
          className="
            mt-5
            overflow-hidden
            rounded-[1.5rem]
            border
            border-border/70
            bg-card
          "
        >
          <div
            className="
              p-5
              text-center
            "
          >
            <div
              className="
                mx-auto
                grid
                h-14
                w-14
                place-items-center
                rounded-2xl
                bg-primary/10
                text-primary
              "
            >
              {(() => {
                const Icon =
                  statusIcons[
                    order.status
                  ] ??
                  Clock3;

                return (
                  <Icon className="h-6 w-6" />
                );
              })()}
            </div>

            <h2
              className="
                mt-3
                text-base
                font-black
              "
            >
              {statusLabel}
            </h2>

            <p
              className="
                mt-1
                text-[9px]
                text-muted-foreground
              "
            >
              آخر تحديث:

              {" "}

              {formatDate(
                order.updated_at,
              )}
            </p>
          </div>


          {/* الخط الزمني */}

          {order.status !==
          "cancelled" ? (
            <div
              className="
                border-t
                border-border/70
                px-4
                py-5
              "
            >
              <div
                className="
                  relative
                  grid
                  grid-cols-5
                "
              >
                <div
                  className="
                    absolute
                    left-[10%]
                    right-[10%]
                    top-3
                    h-0.5
                    bg-border
                  "
                />

                {timeline.map(
                  (
                    status,
                    index,
                  ) => {
                    const done =
                      currentIndex >=
                      index;

                    const Icon =
                      statusIcons[
                        status
                      ] ??
                      Clock3;

                    return (
                      <div
                        key={
                          status
                        }
                        className="
                          relative
                          flex
                          flex-col
                          items-center
                        "
                      >
                        <div
                          className={`
                            relative
                            z-10
                            grid
                            h-6
                            w-6
                            place-items-center
                            rounded-full
                            border-2
                            ${
                              done
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground"
                            }
                          `}
                        >
                          {done ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Icon className="h-3 w-3" />
                          )}
                        </div>

                        <span
                          className={`
                            mt-2
                            text-center
                            text-[7px]
                            font-bold
                            ${
                              done
                                ? "text-primary"
                                : "text-muted-foreground"
                            }
                          `}
                        >
                          {
                            ORDER_STATUS_LABELS[
                              status
                            ]
                          }
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ) : (
            <div
              className="
                border-t
                border-destructive/20
                bg-destructive/5
                p-4
                text-center
                text-[10px]
                font-bold
                text-destructive
              "
            >
              تم إلغاء هذا الطلب.
            </div>
          )}
        </section>


        {/* -------------------------------- */}
        {/* المنتجات */}
        {/* -------------------------------- */}

        <section
          className="
            mt-3
            overflow-hidden
            rounded-[1.5rem]
            border
            border-border/70
            bg-card
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-border/70
              p-4
            "
          >
            <h2
              className="
                text-xs
                font-black
              "
            >
              المنتجات
            </h2>

            <span
              className="
                text-[9px]
                text-muted-foreground
              "
            >
              {items.length.toLocaleString(
                "ar-YE",
              )}

              {" "}

              منتج
            </span>
          </div>


          <div
            className="
              divide-y
              divide-border/70
            "
          >
            {items.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="
                    flex
                    gap-3
                    p-4
                  "
                >
                  <div
                    className="
                      h-16
                      w-16
                      shrink-0
                      overflow-hidden
                      rounded-xl
                      bg-muted
                    "
                  >
                    <img
                      src={
                        item.product_image ||
                        "/placeholder.svg"
                      }
                      alt={
                        item.product_name
                      }
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  </div>


                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-black
                      "
                    >
                      {
                        item.product_name
                      }
                    </p>


                    {item.size ||
                    item.color ? (
                      <p
                        className="
                          mt-1
                          text-[9px]
                          text-muted-foreground
                        "
                      >
                        {item.size
                          ? `المقاس: ${item.size}`
                          : ""}

                        {item.size &&
                        item.color
                          ? " · "
                          : ""}

                        {item.color
                          ? `اللون: ${item.color}`
                          : ""}
                      </p>
                    ) : null}


                    <p
                      className="
                        mt-2
                        text-[9px]
                        text-muted-foreground
                      "
                    >
                      الكمية:

                      {" "}

                      {item.quantity.toLocaleString(
                        "ar-YE",
                      )}
                    </p>
                  </div>


                  <div
                    className="
                      shrink-0
                      text-start
                    "
                  >
                    <p
                      className="
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
                    </p>

                    <p
                      className="
                        mt-1
                        text-[8px]
                        text-muted-foreground
                      "
                    >
                      {formatPrice(
                        item.unit_price,
                      )}
                      {" / "}
                      قطعة
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>


        {/* -------------------------------- */}
        {/* ملخص السعر */}
        {/* -------------------------------- */}

        <section
          className="
            mt-3
            rounded-[1.5rem]
            border
            border-border/70
            bg-card
            p-4
          "
        >
          <h2
            className="
              text-xs
              font-black
            "
          >
            ملخص الدفع
          </h2>


          <div
            className="
              mt-4
              space-y-3
              text-[10px]
            "
          >
            <div
              className="
                flex
                justify-between
              "
            >
              <span className="text-muted-foreground">
                المنتجات
              </span>

              <span>
                {formatPrice(
                  order.subtotal,
                )}
              </span>
            </div>


            <div
              className="
                flex
                justify-between
              "
            >
              <span className="text-muted-foreground">
                التوصيل
              </span>

              <span>
                {formatPrice(
                  order.delivery_fee,
                )}
              </span>
            </div>


            <div
              className="
                flex
                justify-between
                border-t
                border-border
                pt-3
                text-sm
                font-black
              "
            >
              <span>
                الإجمالي
              </span>

              <span className="text-primary">
                {formatPrice(
                  order.total,
                )}
              </span>
            </div>
          </div>


          <div
            className="
              mt-4
              rounded-xl
              bg-primary/5
              p-3
            "
          >
            <p
              className="
                text-[9px]
                text-muted-foreground
              "
            >
              حالة الدفع
            </p>

            <p
              className="
                mt-1
                text-[10px]
                font-black
                text-primary
              "
            >
              {
                PAYMENT_STATUS_LABELS[
                  order.payment_status
                ] ??
                order.payment_status
              }
            </p>
          </div>
        </section>


        {/* -------------------------------- */}
        {/* العنوان */}
        {/* -------------------------------- */}

        <section
          className="
            mt-3
            rounded-[1.5rem]
            border
            border-border/70
            bg-card
            p-4
          "
        >
          <div
            className="
              flex
              items-start
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
              <MapPin
                className="h-4 w-4"
              />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <h2
                className="
                  text-xs
                  font-black
                "
              >
                عنوان التوصيل
              </h2>

              <p
                className="
                  mt-2
                  text-[10px]
                  leading-6
                  text-muted-foreground
                "
              >
                <span
                  className="
                    font-bold
                    text-foreground
                  "
                >
                  {
                    order.shipping_name
                  }
                </span>

                {" — "}

                {
                  order.shipping_phone
                }

                <br />

                {
                  order.shipping_city
                }

                {" — "}

                {
                  order.shipping_district
                }

                <br />

                {
                  order.shipping_details
                }

                {order.shipping_landmark
                  ? (
                    <>
                      <br />
                      أقرب معلم:

                      {" "}

                      {
                        order.shipping_landmark
                      }
                    </>
                  )
                  : null}
              </p>
            </div>
          </div>


          {order.latitude !==
            null &&
          order.longitude !==
            null ? (
            <a
              href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="
                mt-4
                flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-border
                bg-background
                text-[10px]
                font-black
              "
            >
              <MapPin
                className="
                  h-4
                  w-4
                  text-primary
                "
              />

              فتح موقع التوصيل
            </a>
          ) : null}
        </section>


        {/* -------------------------------- */}
        {/* المندوب */}
        {/* -------------------------------- */}

        {order.couriers ? (
          <section
            className="
              mt-3
              rounded-[1.5rem]
              border
              border-border/70
              bg-card
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  grid
                  h-10
                  w-10
                  place-items-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Truck
                  className="h-4 w-4"
                />
              </div>

              <div>
                <p
                  className="
                    text-[9px]
                    text-muted-foreground
                  "
                >
                  مندوب التوصيل
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    font-black
                  "
                >
                  {
                    order.couriers.name
                  }
                </p>

                <a
                  dir="ltr"
                  href={`tel:${order.couriers.phone}`}
                  className="
                    mt-1
                    block
                    text-[10px]
                    text-primary
                  "
                >
                  {
                    order.couriers.phone
                  }
                </a>
              </div>
            </div>
          </section>
        ) : null}


        {/* -------------------------------- */}
        {/* ملاحظات العميل */}
        {/* -------------------------------- */}

        {order.notes ? (
          <section
            className="
              mt-3
              rounded-[1.5rem]
              border
              border-border/70
              bg-card
              p-4
            "
          >
            <h2
              className="
                text-xs
                font-black
              "
            >
              ملاحظات الطلب
            </h2>

            <p
              className="
                mt-2
                text-[10px]
                leading-6
                text-muted-foreground
              "
            >
              {
                order.notes
              }
            </p>
          </section>
        ) : null}


        {/* -------------------------------- */}
        {/* الإجراءات */}
        {/* -------------------------------- */}

        <div
          className="
            mt-4
            grid
            gap-2
            sm:grid-cols-2
          "
        >
          <Dialog>
            <DialogTrigger
              asChild
            >
              <button
                type="button"
                className="
                  flex
                  min-h-13
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  text-[10px]
                  font-black
                "
              >
                <FileText
                  className="h-4 w-4 text-primary"
                />

                عرض الفاتورة
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
                        PAYMENT_STATUS_LABELS[
                          order.payment_status
                        ] ??
                        order.payment_method_code,

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
                          item.product_image ??
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


          {canCancel ? (
            <button
              type="button"
              disabled={
                cancelling
              }
              onClick={
                cancelOrder
              }
              className="
                flex
                min-h-13
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-destructive/30
                bg-destructive/5
                text-[10px]
                font-black
                text-destructive
                disabled:opacity-50
              "
            >
              <XCircle
                className="h-4 w-4"
              />

              {cancelling
                ? "جارٍ الإلغاء..."
                : "إلغاء الطلب"}
            </button>
          ) : null}
        </div>


        {/* العودة */}

        <Link
          to="/orders"
          className="
            mt-3
            flex
            min-h-12
            items-center
            justify-center
            gap-2
            text-[10px]
            font-black
            text-muted-foreground
          "
        >
          <ArrowRight
            className="h-4 w-4"
          />

          العودة إلى جميع الطلبات
        </Link>
      </main>


      <BottomNav />
    </div>
  );
}

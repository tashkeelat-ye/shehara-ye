import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  Share2,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import {
  PAYMENT_STATUS_LABELS,
} from "@/lib/store";

import {
  InvoiceView,
  type InvoiceData,
} from "@/components/InvoiceView";

import {
  shareInvoiceAsTextFile,
} from "@/lib/invoice-sharing";

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  issued_at: string;
  snapshot: unknown;
};

type OrderRow = {
  id: string;
  order_number: string;

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

  notes: string | null;
  created_at: string;

  invoice_number: string | null;

  order_items:
    | OrderItem[]
    | null;

  invoices:
    | InvoiceRow[]
    | null;
};

function getInvoiceNumber(
  order: OrderRow,
): string | null {
  return (
    order.invoice_number ??
    order.invoices?.[0]?.invoice_number ??
    null
  );
}

function getInvoiceDate(
  order: OrderRow,
): string {
  return (
    order.invoices?.[0]?.issued_at ??
    order.created_at
  );
}

function getInvoiceAddress(
  order: OrderRow,
): string {
  return [
    order.shipping_city,
    order.shipping_district,
    order.shipping_details,
    order.shipping_landmark,
  ]
    .filter(Boolean)
    .join(" - ");
}

export const Route = createFileRoute(
  "/_authenticated/invoice/$id",
)({
  component: InvoicePage,
});

function InvoicePage() {
  const { id } =
    Route.useParams();

  const query = useQuery({
    queryKey: [
      "customer-invoice",
      id,
    ],

    queryFn: async (): Promise<OrderRow> => {
      if (!id) {
        throw new Error(
          "معرّف الطلب غير صالح.",
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select(
          [
            "id",
            "order_number",
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
            "notes",
            "created_at",
            "invoice_number",
            "order_items(id,product_name,product_image,quantity,unit_price,size,color)",
            "invoices(id,invoice_number,issued_at,snapshot)",
          ].join(","),
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "[InvoicePage] query failed:",
          error,
        );

        throw error;
      }

      if (!data) {
        throw new Error(
          "الطلب غير موجود أو لا تملك صلاحية الوصول إليه.",
        );
      }

      return data as OrderRow;
    },
  });

  const handleShare = async () => {
    if (!query.data) {
      toast.error(
        "بيانات الفاتورة غير متاحة.",
      );

      return;
    }

    const order =
      query.data;

    const invoiceNumber =
      getInvoiceNumber(order);

    if (!invoiceNumber) {
      toast.error(
        "لا توجد فاتورة إلكترونية صادرة لهذا الطلب.",
      );

      return;
    }

    try {
      const result =
        await shareInvoiceAsTextFile({
          invoiceNumber,

          orderNumber:
            order.order_number,

          invoiceDate:
            getInvoiceDate(order),

          customerName:
            order.shipping_name,

          customerPhone:
            order.shipping_phone,

          customerAddress:
            getInvoiceAddress(order),

          paymentMethod:
            order.payment_method_code,

          paymentStatus:
            PAYMENT_STATUS_LABELS[
              order.payment_status
            ] ??
            order.payment_status,

          items: (
            order.order_items ?? []
          ).map((item) => ({
            title:
              item.product_name,

            quantity:
              item.quantity,

            price:
              item.unit_price,

            size:
              item.size,

            color:
              item.color,
          })),

          subtotal:
            order.subtotal,

          shippingFee:
            order.delivery_fee,

          total:
            order.total,

          notes:
            order.notes,
        });

      if (result === "copied") {
        toast.success(
          "تم تجهيز الفاتورة ونسخ نصها. يمكنك لصقه ومشاركته الآن.",
        );
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "[InvoicePage] sharing failed:",
        error,
      );

      toast.error(
        "تعذر تجهيز الفاتورة للمشاركة.",
      );
    }
  };

  if (query.isLoading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F2EE] p-6"
      >
        <div className="mx-auto max-w-4xl animate-pulse rounded-3xl bg-white p-10 text-center">
          جارٍ تجهيز الفاتورة الإلكترونية...
        </div>
      </div>
    );
  }

  if (
    query.isError ||
    !query.data
  ) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F2EE] p-6"
      >
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-black text-[#0D3B4D]">
            تعذر فتح الفاتورة
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {query.error instanceof Error
              ? query.error.message
              : "حدث خطأ غير متوقع."}
          </p>

          <Link
            to="/orders"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-5 py-3 text-xs font-bold text-white"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى طلباتي
          </Link>
        </div>
      </div>
    );
  }

  const order =
    query.data;

  const invoiceNumber =
    getInvoiceNumber(order);

  if (!invoiceNumber) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F2EE] p-6"
      >
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-black text-[#0D3B4D]">
            الفاتورة غير متاحة
          </h1>

          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            لم يتم إصدار سجل الفاتورة لهذا الطلب.
            إذا كان الطلب جديداً، أعد فتح الصفحة بعد
            لحظات. إذا استمرت المشكلة، فهناك مشكلة
            في إصدار الفاتورة من قاعدة البيانات.
          </p>

          <Link
            to="/orders"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-5 py-3 text-xs font-bold text-white"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى طلباتي
          </Link>
        </div>
      </div>
    );
  }

  const invoice:
    Partial<InvoiceData> = {
    invoiceNumber,

    invoiceDate:
      getInvoiceDate(order),

    orderNumber:
      order.order_number,

    customerDetails: {
      name:
        order.shipping_name,

      phone:
        order.shipping_phone,

      address:
        getInvoiceAddress(order),

      paymentMethod:
        order.payment_method_code,

      paymentStatus:
        PAYMENT_STATUS_LABELS[
          order.payment_status
        ] ??
        order.payment_status,

      currency:
        "ريال يمني (YER)",
    },

    items: (
      order.order_items ?? []
    ).map((item) => ({
      id: item.id,

      title:
        item.product_name,

      description: [
        item.size
          ? `المقاس: ${item.size}`
          : "",

        item.color
          ? `اللون: ${item.color}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),

      image:
        item.product_image ||
        undefined,

      quantity:
        item.quantity,

      price:
        item.unit_price,

      currency:
        "YER",

      size:
        item.size,

      color:
        item.color,
    })),

    subtotal:
      order.subtotal,

    shippingFee:
      order.delivery_fee,

    total:
      order.total,

    notes:
      order.notes ?? "",
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F6F2EE] py-4 md:py-8"
    >
      <div className="mx-auto max-w-4xl px-2 md:px-4">

        <div className="mb-3 flex items-center justify-between gap-2 print:hidden">

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#0D3B4D] shadow-sm"
          >
            <ArrowRight className="h-4 w-4" />
            طلباتي
          </Link>

          <button
            type="button"
            onClick={() =>
              void handleShare()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-4 py-2.5 text-xs font-bold text-white"
          >
            <Share2 className="h-4 w-4 text-[#E2723A]" />
            مشاركة الفاتورة
          </button>

        </div>

        <InvoiceView
          order={invoice}
        />

      </div>
    </div>
  );
}

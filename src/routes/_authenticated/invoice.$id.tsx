import { createFileRoute, Link } from "@tanstack/react-router";
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

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
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

  order_items: OrderItem[] | null;

  invoices: {
    invoice_number: string;
  }[] | null;
};

export const Route = createFileRoute(
  "/_authenticated/invoice/$id",
)({
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();

  const query = useQuery({
    queryKey: ["customer-invoice", id],

    queryFn: async (): Promise<OrderRow> => {
      const { data, error } = await supabase
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
            "order_items(id,product_name,product_image,quantity,unit_price,size,color)",
            "invoices(invoice_number)",
          ].join(","),
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "الفاتورة غير موجودة أو لا تملك صلاحية الوصول إليها.",
        );
      }

      return data as OrderRow;
    },
  });

  const share = async () => {
    const url = window.location.href;

    try {
      if (
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: `فاتورة شهارة`,
          text: `الفاتورة الإلكترونية للطلب ${
            query.data?.order_number ?? ""
          }`,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);

      toast.success(
        "تم نسخ رابط الفاتورة.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      toast.error(
        "تعذر مشاركة الفاتورة.",
      );
    }
  };

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F2EE] p-6">
        <div className="mx-auto max-w-4xl animate-pulse rounded-3xl bg-white p-10">
          جارٍ تجهيز الفاتورة...
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
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

  const order = query.data;

  const invoiceNumber =
    order.invoices?.[0]?.invoice_number;

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

          <p className="mt-2 text-sm text-muted-foreground">
            لم يتم إصدار فاتورة إلكترونية لهذا الطلب بعد.
          </p>
        </div>
      </div>
    );
  }

  const invoice: Partial<InvoiceData> = {
    invoiceNumber,

    invoiceDate: new Date(
      order.created_at,
    ).toLocaleDateString("ar-YE"),

    orderNumber:
      order.order_number,

    customerDetails: {
      name: order.shipping_name,
      phone: order.shipping_phone,

      address: [
        order.shipping_city,
        order.shipping_district,
        order.shipping_details,
        order.shipping_landmark,
      ]
        .filter(Boolean)
        .join(" - "),

      paymentMethod:
        order.payment_method_code,

      paymentStatus:
        PAYMENT_STATUS_LABELS[
          order.payment_status
        ] ?? order.payment_status,

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
        item.product_image || undefined,

      quantity:
        item.quantity,

      price:
        item.unit_price,
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
            onClick={() => void share()}
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

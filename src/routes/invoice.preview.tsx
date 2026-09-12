import { createFileRoute } from "@tanstack/react-router";

import { InvoiceView } from "@/components/InvoiceView";

export const Route = createFileRoute(
  "/invoice/preview",
)({
  component: InvoicePreviewPage,
});

function InvoicePreviewPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F6F2EE] px-2 py-6 md:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 rounded-2xl border border-[#0D3B4D]/10 bg-white px-5 py-4">
          <h1 className="text-base font-black text-[#0D3B4D]">
            معاينة نظام الفاتورة الإلكترونية
          </h1>

          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            هذه معاينة تجريبية لشكل الفاتورة باستخدام
            إعدادات الفاتورة الحالية. لا يتم إنشاء سجل
            فاتورة حقيقي من هذه الصفحة.
          </p>
        </div>

        <InvoiceView
          order={{
            invoice_number:
              "INV-2026-000001",

            order_number:
              "TSK-1001",

            created_at:
              new Date().toISOString(),

            currency:
              "YER",

            shipping_name:
              "عميل تجريبي",

            shipping_phone:
              "771234567",

            shipping_city:
              "صنعاء",

            shipping_district:
              "التحرير",

            shipping_details:
              "عنوان تجريبي للمعاينة",

            shipping_landmark:
              "بجوار المعلم التجريبي",

            payment_method_code:
              "الدفع عند الاستلام",

            payment_status:
              "unpaid",

            subtotal:
              25000,

            delivery_fee:
              0,

            total:
              25000,

            notes:
              "هذه بيانات تجريبية للمعاينة فقط.",

            order_items: [
              {
                id:
                  "preview-item-1",

                product_name:
                  "منتج تجريبي",

                product_image:
                  "/logo.png",

                quantity:
                  1,

                unit_price:
                  25000,

                currency:
                  "YER",

                size:
                  null,

                color:
                  null,
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

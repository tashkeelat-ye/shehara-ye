export type InvoiceData = {
  invoiceNumber: string;
  orderNumber: string;
  date: string;

  customerName: string;
  customerPhone: string;
  address: string;

  paymentMethod: string;

  items: {
    name: string;
    quantity: number;
    unitPrice: number;
  }[];

  subtotal: number;
  deliveryFee: number;
  total: number;

  storeName: string;

  formatMoney: (n: number) => string;
};

/**
 * التوافق مع الأجزاء القديمة من التطبيق.
 *
 * النظام الجديد يستخدم:
 * /invoice/:id
 *
 * لذلك لا ننشئ نافذة HTML ثانية،
 * ولا نطبع نسخة منفصلة من الفاتورة.
 */
export function openInvoice(data: InvoiceData) {
  const params = new URLSearchParams();

  params.set("invoice", data.invoiceNumber);
  params.set("order", data.orderNumber);

  const url =
    `${window.location.origin}/invoice/${encodeURIComponent(
      data.orderNumber,
    )}?${params.toString()}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );
}

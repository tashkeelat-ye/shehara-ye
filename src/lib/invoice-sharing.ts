export type InvoiceShareItem = {
  title: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
};

export type InvoiceShareData = {
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;

  customerName: string;
  customerPhone: string;
  customerAddress: string;

  paymentMethod: string;
  paymentStatus: string;

  items: InvoiceShareItem[];

  subtotal: number;
  shippingFee: number;
  total: number;

  notes?: string | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 2,
  }).format(value);
}

function clean(value: string | null | undefined): string {
  return value?.trim() || "-";
}

/**
 * تجهيز محتوى الفاتورة كنص عربي قابل للمشاركة.
 *
 * لا يحتوي على أي روابط للمعاينة.
 * يمكن مشاركته مباشرة كملف TXT أو كنص.
 */
export function buildInvoiceShareText(
  invoice: InvoiceShareData,
): string {
  const lines: string[] = [];

  lines.push("شهارة للتسوق");
  lines.push("==============================");
  lines.push("الفاتورة الإلكترونية");
  lines.push("==============================");
  lines.push("");

  lines.push(`رقم الفاتورة: ${clean(invoice.invoiceNumber)}`);
  lines.push(`رقم الطلب: ${clean(invoice.orderNumber)}`);
  lines.push(`تاريخ الفاتورة: ${clean(invoice.invoiceDate)}`);
  lines.push("");

  lines.push("بيانات العميل");
  lines.push("------------------------------");
  lines.push(`الاسم: ${clean(invoice.customerName)}`);
  lines.push(`الهاتف: ${clean(invoice.customerPhone)}`);
  lines.push(`العنوان: ${clean(invoice.customerAddress)}`);
  lines.push("");

  lines.push("بيانات الدفع");
  lines.push("------------------------------");
  lines.push(`طريقة الدفع: ${clean(invoice.paymentMethod)}`);
  lines.push(`حالة الدفع: ${clean(invoice.paymentStatus)}`);
  lines.push("");

  lines.push("تفاصيل المنتجات");
  lines.push("------------------------------");

  invoice.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${clean(item.title)}`,
    );

    lines.push(
      `   الكمية: ${formatNumber(item.quantity)}`,
    );

    lines.push(
      `   سعر الوحدة: ${formatNumber(item.price)} ريال`,
    );

    lines.push(
      `   الإجمالي: ${formatNumber(
        item.price * item.quantity,
      )} ريال`,
    );

    if (item.size) {
      lines.push(`   المقاس: ${item.size}`);
    }

    if (item.color) {
      lines.push(`   اللون: ${item.color}`);
    }

    lines.push("");
  });

  lines.push("ملخص الفاتورة");
  lines.push("------------------------------");
  lines.push(
    `الإجمالي الفرعي: ${formatNumber(
      invoice.subtotal,
    )} ريال`,
  );

  lines.push(
    `رسوم التوصيل: ${formatNumber(
      invoice.shippingFee,
    )} ريال`,
  );

  lines.push(
    `الإجمالي النهائي: ${formatNumber(
      invoice.total,
    )} ريال`,
  );

  if (invoice.notes?.trim()) {
    lines.push("");
    lines.push("ملاحظات");
    lines.push("------------------------------");
    lines.push(invoice.notes.trim());
  }

  lines.push("");
  lines.push("==============================");
  lines.push("شكراً لتسوقك من شهارة للتسوق");
  lines.push("shehara.com");
  lines.push("==============================");

  return lines.join("\n");
}

/**
 * مشاركة الفاتورة كملف TXT.
 *
 * على الهواتف الحديثة:
 * - ينشئ ملفاً حقيقياً.
 * - يفتح قائمة المشاركة الأصلية للهاتف.
 *
 * في الأجهزة التي لا تدعم مشاركة الملفات:
 * - ينسخ محتوى الفاتورة إلى الحافظة.
 */
export async function shareInvoiceAsTextFile(
  invoice: InvoiceShareData,
): Promise<"shared" | "copied"> {
  const text =
    buildInvoiceShareText(invoice);

  const safeInvoiceNumber =
    invoice.invoiceNumber
      .replace(/[^\w\u0600-\u06FF-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const fileName =
    `فاتورة-${safeInvoiceNumber || "شهارة"}.txt`;

  const file = new File(
    [text],
    fileName,
    {
      type: "text/plain;charset=utf-8",
    },
  );

  const shareData: ShareData = {
    title: `فاتورة شهارة — ${invoice.invoiceNumber}`,
    text: `الفاتورة الإلكترونية للطلب ${invoice.orderNumber}`,
    files: [file],
  };

  try {
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({
        files: [file],
      })
    ) {
      await navigator.share(shareData);
      return "shared";
    }
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    console.warn(
      "[InvoiceSharing] File sharing failed:",
      error,
    );
  }

  try {
    await navigator.clipboard.writeText(text);

    return "copied";
  } catch (error) {
    console.error(
      "[InvoiceSharing] Clipboard failed:",
      error,
    );

    throw new Error(
      "تعذر تجهيز الفاتورة للمشاركة على هذا الجهاز.",
    );
  }
}

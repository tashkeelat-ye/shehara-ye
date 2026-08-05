/** فاتورة إلكترونية قابلة للطباعة/الحفظ كـ PDF عبر نافذة الطباعة (تدعم العربية بالكامل). */
export type InvoiceData = {
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  storeName: string;
  formatMoney: (n: number) => string;
};

export function openInvoice(data: InvoiceData) {
  const rows = data.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>${escapeHtml(
          data.formatMoney(i.unitPrice),
        )}</td><td>${escapeHtml(data.formatMoney(i.unitPrice * i.quantity))}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>فاتورة ${escapeHtml(data.invoiceNumber)}</title>
<style>
  body{font-family:system-ui,"Tajawal",sans-serif;padding:24px;color:#1b1230}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#6b6480;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border:1px solid #ded8ea;padding:8px;text-align:right}
  th{background:#f5f1fb}
  .totals{margin-top:12px;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{font-weight:bold;border-top:1px solid #ded8ea}
</style></head><body>
<h1>${escapeHtml(data.storeName)}</h1>
<p class="muted">فاتورة رقم ${escapeHtml(data.invoiceNumber)} · طلب ${escapeHtml(data.orderNumber)} · ${escapeHtml(data.date)}</p>
<p class="muted">${escapeHtml(data.customerName)} — ${escapeHtml(data.customerPhone)}<br/>${escapeHtml(data.address)}<br/>طريقة الدفع: ${escapeHtml(data.paymentMethod)}</p>
<table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
  <div><span>المجموع</span><span>${escapeHtml(data.formatMoney(data.subtotal))}</span></div>
  <div><span>التوصيل</span><span>${escapeHtml(data.formatMoney(data.deliveryFee))}</span></div>
  <div class="grand"><span>الإجمالي</span><span>${escapeHtml(data.formatMoney(data.total))}</span></div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

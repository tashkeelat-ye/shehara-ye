import React from "react";
import { 
  FileText, 
  Store, 
  User, 
  MessageSquare, 
  Wallet, 
  Truck, 
  Clock, 
  FlaskConical, 
  ShieldCheck, 
  QrCode, 
  Printer
} from "lucide-react";

export interface OrderItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  storeDetails: {
    name: string;
    crNumber: string;
    taxNumber: string;
    address: string;
    phone: string;
  };
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    paymentMethod: string;
    currency: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  notes?: string;
}

interface InvoiceViewProps {
  order?: Partial<InvoiceData>;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ order }) => {
  const data: InvoiceData = {
    invoiceNumber: order?.invoiceNumber || "INV-2026-001015",
    invoiceDate: order?.invoiceDate || new Date().toLocaleDateString("ar-YE") + " - " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    orderNumber: order?.orderNumber || "TSK-1015",
    storeDetails: {
      name: order?.storeDetails?.name || "شهارة للتسوق",
      crNumber: order?.storeDetails?.crNumber || "123456-7",
      taxNumber: order?.storeDetails?.taxNumber || "777888999",
      address: order?.storeDetails?.address || "إب - اليمن",
      phone: order?.storeDetails?.phone || "77 000 1111",
    },
    customerDetails: {
      name: order?.customerDetails?.name || "عميل المتجر",
      phone: order?.customerDetails?.phone || "770000000",
      address: order?.customerDetails?.address || "إب - اليمن",
      paymentMethod: order?.customerDetails?.paymentMethod || "محفظة شهارة",
      currency: order?.customerDetails?.currency || "ريال يمني (YER)",
    },
    items: order?.items && order.items.length > 0 ? order.items : [
      {
        id: "1",
        title: "عسل سدر دوعني أصلي - 1 كجم",
        description: "منتج أصلي عالي الجودة",
        quantity: 1,
        price: 55000,
        image: "/logo.png",
      },
    ],
    subtotal: order?.subtotal ?? 55000,
    discount: order?.discount ?? 0,
    shippingFee: order?.shippingFee ?? 4000,
    total: order?.total ?? 59000,
    notes: order?.notes || "شكراً لتسوقكم معنا، نتمنى لكم تجربة تسوق ممتعة",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-gray-800 p-4 md:p-8 dir-rtl font-sans print:p-0 print:m-0 print:w-full print:max-w-none shadow-2xl rounded-3xl border border-gray-100">
      
      {/* شريط الإجراءات العلوي (يختفي عند الطباعة) */}
      <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
        <div className="text-xs text-gray-500 font-medium">
          📄 الفاتورة الإلكترونية الضريبية الرسمية
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#3e0b1b] text-white text-xs font-bold rounded-xl hover:bg-[#581329] transition-all flex items-center gap-2 shadow"
        >
          <Printer className="w-4 h-4 text-[#c49a37]" />
          <span>طباعة الفاتورة / PDF</span>
        </button>
      </div>

      {/* 1. الهيدر والشعار */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-6 border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#3e0b1b] rounded-2xl flex items-center justify-center p-2 shadow-md shrink-0">
            <img src="/logo.png" alt="شهارة" className="max-h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#3e0b1b] tracking-tight">شهارة</h1>
            <p className="text-xs text-[#c49a37] font-bold tracking-widest mt-0.5">للتسوق</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c49a37] inline-block"></span>
              كل ما تحتاجه... في مكان واحد
            </p>
          </div>
        </div>

        <div className="text-right md:text-left w-full md:w-auto">
          <div className="inline-flex items-center gap-2 bg-[#3e0b1b] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm mb-2">
            <FileText className="w-4 h-4 text-[#c49a37]" />
            <span>فاتورة ضريبية / Tax Invoice</span>
          </div>
          <div className="text-xs space-y-1 font-medium text-gray-700">
            <p><span className="text-gray-400 ml-1">رقم الفاتورة:</span> <span className="font-bold font-mono text-gray-900">{data.invoiceNumber}</span></p>
            <p><span className="text-gray-400 ml-1">تاريخ الفاتورة:</span> <span className="font-semibold">{data.invoiceDate}</span></p>
            <p><span className="text-gray-400 ml-1">رقم الطلب:</span> <span className="font-bold font-mono text-[#3e0b1b]">{data.orderNumber}</span></p>
          </div>
        </div>
      </div>

      {/* 2. بيانات المتجر والعميل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* بيانات المتجر */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-[#fcf9fa]">
          <div className="bg-[#f5eef1] px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-[#3e0b1b]">بيانات المتجر</span>
            <div className="w-6 h-6 rounded-full bg-[#3e0b1b] text-white flex items-center justify-center">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="p-3 text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">اسم المتجر</span><span className="font-semibold text-gray-800">{data.storeDetails.name}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">السجل التجاري</span><span className="font-semibold font-mono text-gray-800">{data.storeDetails.crNumber}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">الرقم الضريبي</span><span className="font-semibold font-mono text-gray-800">{data.storeDetails.taxNumber}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">العنوان</span><span className="font-semibold text-gray-800">{data.storeDetails.address}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">رقم الجوال</span><span className="font-semibold font-mono text-gray-800">{data.storeDetails.phone}</span></div>
          </div>
        </div>

        {/* بيانات العميل */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-[#fcf9fa]">
          <div className="bg-[#f5eef1] px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-[#3e0b1b]">بيانات العميل</span>
            <div className="w-6 h-6 rounded-full bg-[#3e0b1b] text-white flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="p-3 text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">الاسم</span><span className="font-semibold text-gray-800">{data.customerDetails.name}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">رقم الجوال</span><span className="font-semibold font-mono text-gray-800">{data.customerDetails.phone}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100 items-start"><span className="text-gray-500 shrink-0">العنوان</span><span className="font-semibold text-gray-800 text-left max-w-[200px] truncate">{data.customerDetails.address}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">طريقة الدفع</span><span className="font-semibold font-mono text-gray-800">{data.customerDetails.paymentMethod}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">العملة</span><span className="font-semibold text-gray-800">{data.customerDetails.currency}</span></div>
          </div>
        </div>
      </div>

      {/* 3. جدول المنتجات */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-[#3e0b1b] text-white">
              <th className="p-3 text-center w-10">#</th>
              <th className="p-3">المنتج</th>
              <th className="p-3 text-center w-20">الكمية</th>
              <th className="p-3 text-center w-28">سعر الوحدة</th>
              <th className="p-3 text-left w-28">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.items.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50/50">
                <td className="p-3 text-center font-bold text-gray-500">{index + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <div className="w-9 h-9 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={item.image} alt={item.title} className="max-h-full max-w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      {item.description && <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center font-bold text-gray-800">{item.quantity}</td>
                <td className="p-3 text-center font-semibold text-gray-700">{item.price.toLocaleString()} ر.ي</td>
                <td className="p-3 text-left font-bold text-[#3e0b1b]">{(item.price * item.quantity).toLocaleString()} ر.ي</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. قسم الملاحظات والمجاميع */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-7 space-y-3">
          <div className="border border-gray-200 rounded-2xl p-3 bg-[#fcf9fa] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#3e0b1b] text-white flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#3e0b1b] mb-1">ملاحظات</p>
              <p className="text-xs text-gray-600 leading-relaxed">{data.notes}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-3 bg-[#fcf9fa] flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#3e0b1b] text-white flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#3e0b1b]">طريقة الدفع</p>
              <p className="text-xs text-gray-600 font-semibold font-mono">{data.customerDetails.paymentMethod}</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 border border-gray-200 rounded-2xl overflow-hidden bg-[#fcf9fa] flex flex-col justify-between">
          <div className="p-3 text-xs space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>المجموع الفرعي</span>
              <span className="font-semibold">{data.subtotal.toLocaleString()} ر.ي</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>الخصم</span>
                <span className="font-semibold">{data.discount.toLocaleString()} ر.ي</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>رسوم التوصيل</span>
              <span className="font-semibold">{data.shippingFee.toLocaleString()} ر.ي</span>
            </div>
          </div>

          <div className="bg-[#3e0b1b] text-white p-3.5 flex justify-between items-center">
            <span className="text-xs font-bold">المجموع الكلي</span>
            <span className="text-base md:text-lg font-black text-white">{data.total.toLocaleString()} ر.ي</span>
          </div>
        </div>
      </div>

      {/* 5. شريط المميزات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-center border-t border-b py-4 border-gray-100">
        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <Truck className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">توصيل سريع</span>
          <span className="text-[9px] text-gray-400">إلى جميع المناطق</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">دعم وخدمة</span>
          <span className="text-[9px] text-gray-400">على مدار الساعة</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <FlaskConical className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">مفحوص مخبرياً</span>
          <span className="text-[9px] text-gray-400">آمن وصحي</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">منتجات أصلية</span>
          <span className="text-[9px] text-gray-400">100% جودة مضمونة</span>
        </div>
      </div>

      {/* 6. الفوتر والختم */}
      <div className="bg-[#3e0b1b] text-white rounded-3xl p-4 md:p-5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-center md:justify-start">
          <div className="w-14 h-14 bg-white rounded-xl p-1 flex items-center justify-center text-[#3e0b1b] shrink-0">
            <QrCode className="w-full h-full" />
          </div>
          <div className="text-[11px] space-y-0.5">
            <p className="font-bold text-white">تواصل معنا</p>
            <p className="text-gray-300 font-mono dir-ltr text-right">{data.storeDetails.phone}</p>
            <p className="text-gray-300">shehara.lovable.app</p>
            <p className="text-gray-400 text-[10px]">@shehara.lovable.app</p>
          </div>
        </div>

        <div className="z-10 flex flex-col items-center my-2 md:my-0">
          <div className="w-12 h-12 bg-[#c49a37] rounded-full p-1 shadow-lg border-2 border-amber-200 flex items-center justify-center">
            <div className="w-full h-full border border-dashed border-white/60 rounded-full flex items-center justify-center bg-[#3e0b1b]/20">
              <img src="/logo.png" alt="ختم" className="w-6 h-6 object-contain" />
            </div>
          </div>
        </div>

        <div className="text-center md:text-left z-10 max-w-xs">
          <h3 className="text-sm md:text-base font-bold text-[#c49a37]">شكراً لثقتكم بنا</h3>
          <p className="text-[10px] text-gray-300 mt-0.5">شهارة للتسوق... كل ما تحتاجه في مكان واحد</p>
        </div>
      </div>

    </div>
  );
};

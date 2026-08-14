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
  Printer,
  Phone,
  Globe,
  Facebook,
  Instagram
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
  // بيانات افتراضية مطابقة للصورة في حال عدم تمرير بيانات كاملة
  const data: InvoiceData = {
    invoiceNumber: order?.invoiceNumber || "INV-2024-000567",
    invoiceDate: order?.invoiceDate || "04 أغسطس 2024 - 10:30",
    orderNumber: order?.orderNumber || "ORD-2024-001234",
    storeDetails: {
      name: order?.storeDetails?.name || "تشكيلات للتسوق",
      crNumber: order?.storeDetails?.crNumber || "123456-7",
      taxNumber: order?.storeDetails?.taxNumber || "777888999",
      address: order?.storeDetails?.address || "إب - اليمن",
      phone: order?.storeDetails?.phone || "77 000 1111",
    },
    customerDetails: {
      name: order?.customerDetails?.name || "أحمد محمد سعيد",
      phone: order?.customerDetails?.phone || "77 123 4567",
      address: order?.customerDetails?.address || "إب - جولة العدين - شارع الثلاثين",
      paymentMethod: order?.customerDetails?.paymentMethod || "الدفع عند الاستلام",
      currency: order?.customerDetails?.currency || "ريال يمني (YER)",
    },
    items: order?.items || [
      {
        id: "1",
        title: "منتج تجريبي",
        description: "الواصف: وصف مختصر للمنتج",
        quantity: 1,
        price: 25000,
        image: "/logo.png",
      },
      {
        id: "2",
        title: "منتج تجريبي آخر",
        description: "الواصف: وصف مختصر للمنتج",
        quantity: 2,
        price: 15000,
        image: "/logo.png",
      },
      {
        id: "3",
        title: "منتج ثالث",
        description: "الواصف: وصف مختصر للمنتج",
        quantity: 1,
        price: 40000,
        image: "/logo.png",
      },
      {
        id: "4",
        title: "منتج رابع",
        description: "الواصف: وصف مختصر للمنتج",
        quantity: 1,
        price: 18000,
        image: "/logo.png",
      },
    ],
    subtotal: order?.subtotal ?? 113000,
    discount: order?.discount ?? 8000,
    shippingFee: order?.shippingFee ?? 2000,
    total: order?.total ?? 107000,
    notes: order?.notes || "شكراً لتسوقكم معنا، نتمنى لكم تجربة تسوق ممتعة",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-gray-800 p-6 md:p-8 dir-rtl font-sans print:p-0 print:m-0 print:w-full print:max-w-none shadow-xl rounded-2xl border print:border-none print:shadow-none">
      
      {/* شريط الإجراءات (يختفي أثناء الطباعة) */}
      <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
        <div className="text-xs text-gray-500">
          معاينة الفاتورة الإلكترونية الرسمية لمتجر تشكيلات
        </div>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-[#3e0b1b] text-white text-sm font-bold rounded-xl hover:bg-[#581329] transition-all flex items-center gap-2 shadow-md"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة / حفظ كـ PDF</span>
        </button>
      </div>

      {/* 1. الهيدر العادي والرسمي */}
      <div className="flex justify-between items-start mb-6">
        {/* جهة اليمين: الشعار والهوية */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-[#3e0b1b] rounded-2xl flex items-center justify-center p-2 shadow-inner">
            <img src="/logo.png" alt="تشكيلات" className="max-h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-[#3e0b1b] tracking-tight">تشكيلات</h1>
            <p className="text-xs text-[#c49a37] font-bold tracking-widest mt-0.5">للتسوق</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c49a37] inline-block"></span>
              كل ما تحتاجه... في مكان واحد
            </p>
          </div>
        </div>

        {/* جهة اليسار: بيانات الفاتورة وسارة الضريبية */}
        <div className="text-left space-y-1">
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

      {/* 2. بطاقتان: بيانات المتجر وبيانات العميل */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* بيانات المتجر */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-[#fcf9fa]">
          <div className="bg-[#f5eef1] px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3e0b1b]">
              <span>بيانات المتجر</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#3e0b1b] text-white flex items-center justify-center">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="p-3 text-xs space-y-1.5">
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
            <div className="flex items-center gap-2 text-xs font-bold text-[#3e0b1b]">
              <span>بيانات العميل</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#3e0b1b] text-white flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="p-3 text-xs space-y-1.5">
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">الاسم</span><span className="font-semibold text-gray-800">{data.customerDetails.name}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">رقم الجوال</span><span className="font-semibold font-mono text-gray-800">{data.customerDetails.phone}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">العنوان</span><span className="font-semibold text-gray-800">{data.customerDetails.address}</span></div>
            <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">طريقة الدفع</span><span className="font-semibold text-gray-800">{data.customerDetails.paymentMethod}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">العملة</span><span className="font-semibold text-gray-800">{data.customerDetails.currency}</span></div>
          </div>
        </div>
      </div>

      {/* 3. جدول المنتجات الرئيسي */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-[#3e0b1b] text-white">
              <th className="p-3 text-center w-10">#</th>
              <th className="p-3">المنتج</th>
              <th className="p-3 text-center w-20">الكمية</th>
              <th className="p-3 text-center w-32">سعر الوحدة</th>
              <th className="p-3 text-left w-32">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.items.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50/50">
                <td className="p-3 text-center font-bold text-gray-500">{index + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <div className="w-10 h-10 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
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

      {/* 4. القسم السفلية: الملاحظات والمجموع الكلي */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        {/* ملاحظات وطريقة الدفع (اليمين) */}
        <div className="col-span-7 space-y-3">
          {/* صندوق الملاحظات */}
          <div className="border border-gray-200 rounded-2xl p-3 bg-[#fcf9fa] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#3e0b1b] text-white flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#3e0b1b] mb-1">ملاحظات</p>
              <p className="text-xs text-gray-600 leading-relaxed">{data.notes}</p>
            </div>
          </div>

          {/* صندوق طريقة الدفع */}
          <div className="border border-gray-200 rounded-2xl p-3 bg-[#fcf9fa] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#3e0b1b] text-white flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#3e0b1b]">طريقة الدفع</p>
                <p className="text-xs text-gray-600 font-semibold">{data.customerDetails.paymentMethod}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ملخص الحساب والإجمالي (اليسار) */}
        <div className="col-span-5 border border-gray-200 rounded-2xl overflow-hidden bg-[#fcf9fa] flex flex-col justify-between">
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
            <span className="text-lg font-black text-white">{data.total.toLocaleString()} ر.ي</span>
          </div>
        </div>
      </div>

      {/* 5. شريط الضمان والمميزات (4 أيقونات دائرية) */}
      <div className="grid grid-cols-4 gap-2 mb-6 text-center border-t border-b py-4 border-gray-100">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <Truck className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">توصيل سريع</span>
          <span className="text-[9px] text-gray-400">إلى جميع المناطق</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">دعم وخدمة</span>
          <span className="text-[9px] text-gray-400">على مدار الساعة</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">مفحوص مخبرياً</span>
          <span className="text-[9px] text-gray-400">آمن وصحي</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#3e0b1b] bg-[#fcf9fa]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-gray-800">منتجات أصلية</span>
          <span className="text-[9px] text-gray-400">100% جودة مضمونة</span>
        </div>
      </div>

      {/* 6. الفوتر السفلي الأنيق مع الختم والـ QR Code */}
      <div className="bg-[#3e0b1b] text-white rounded-3xl p-5 relative overflow-hidden flex justify-between items-center">
        {/* QR Code وتواصل معنا */}
        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center text-[#3e0b1b]">
            <QrCode className="w-full h-full" />
          </div>
          <div className="text-[11px] space-y-1">
            <p className="font-bold text-white mb-1">تواصل معنا</p>
            <p className="text-gray-300 font-mono dir-ltr text-right">{data.storeDetails.phone}</p>
            <p className="text-gray-300">tashkeelat.com</p>
            <p className="text-gray-400 text-[10px]">@tashkeelat.shop</p>
          </div>
        </div>

        {/* الختم الذهبي في الوسط */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-[#c49a37] rounded-full p-1 shadow-lg border-2 border-amber-200 flex items-center justify-center">
            <div className="w-full h-full border border-dashed border-white/60 rounded-full flex items-center justify-center bg-[#3e0b1b]/20">
              <img src="/logo.png" alt="ختم" className="w-8 h-8 object-contain" />
            </div>
          </div>
        </div>

        {/* عبارة شكر لثقتكم */}
        <div className="text-left z-10 max-w-xs">
          <h3 className="text-base font-bold text-[#c49a37]">شكراً لثقتكم بنا</h3>
          <p className="text-[10px] text-gray-300 mt-0.5">تشكيلات للتسوق... كل ما تحتاجه في مكان واحد</p>
        </div>
      </div>

    </div>
  );
};
    

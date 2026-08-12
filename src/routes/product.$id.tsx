import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Send, Loader2, ArrowRight, ShoppingBag, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/db";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  // دعم التمرير باللمس للصور (Touch Swipe)
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    async function loadProductData() {
      setLoading(true);
      
      // 1. جلب بيانات المنتج الحالي
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast.error("تعذر تحميل بيانات المنتج");
      } else if (data) {
        const currentProd = data as unknown as Product;
        setProduct(currentProd);
        setSelectedImageIndex(0);

        // 2. جلب المنتجات المشابهة من نفس الفئة
        if (currentProd.category_slug) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("category_slug", currentProd.category_slug)
            .neq("id", currentProd.id)
            .limit(6);

          if (related) {
            setRelatedProducts(related as unknown as Product[]);
          }
        }
      }
      setLoading(false);
    }

    if (id) void loadProductData();
  }, [id]);

  // دالة السحب باللمس للصور
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!product?.images || product.images.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    
    // سحب لليسار -> الصورة التالية
    if (distance > 40 && selectedImageIndex < product.images.length - 1) {
      setSelectedImageIndex((prev) => prev + 1);
    }
    // سحب لليمين -> الصورة السابقة
    if (distance < -40 && selectedImageIndex > 0) {
      setSelectedImageIndex((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center dir-rtl pb-24">
        <p className="text-muted-foreground">المنتج غير موجود أو تم حذفه.</p>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-4 space-y-6 dir-rtl pb-28">
      {/* زر العودة العلوي */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/60 px-3 py-1.5 rounded-xl transition-colors"
        >
          <ArrowRight className="h-4 w-4" /> العودة
        </button>
      </div>

      {/* تفاصيل المنتج الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* معرض الصور التفاعلي باللمس */}
        <div className="space-y-3">
          <div 
            className="relative aspect-square rounded-3xl overflow-hidden border border-border bg-secondary/30 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-300 select-none"
            />

            {/* أسهم التنقل للصور */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={selectedImageIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-border grid place-items-center disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => Math.min(images.length - 1, prev + 1))}
                  disabled={selectedImageIndex === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-border grid place-items-center disabled:opacity-20"
                >
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              </>
            )}

            {/* مؤشر النطاق السفلي للصور */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      selectedImageIndex === idx ? "w-4 bg-primary" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* المصغرات الفردية */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? "border-primary scale-95" : "border-border opacity-60"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* تفاصيل وخيارات المنتج */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground leading-snug">{product.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary">
                {product.price?.toLocaleString()} ر.ي
              </span>
              {product.original_price ? (
                <span className="text-xs text-muted-foreground line-through">
                  {product.original_price?.toLocaleString()} ر.ي
                </span>
              ) : null}
            </div>
          </div>

          {/* تحديد المقاسات */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اختر المقاس:</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      selectedSize === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* تحديد اللون */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اختر اللون:</label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      selectedColor === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* وصف المنتج */}
          {product.description && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">الوصف:</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* أزرار الإجراءات والشراء (شراء الآن + أضف للسلة) */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={() => toast.success("تمت إضافة المنتج إلى السلة!")}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-secondary text-foreground border border-border font-bold text-xs hover:bg-secondary/80 transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-primary" /> أضف إلى السلة
            </button>

            <button
              type="button"
              onClick={() => {
                toast.success("جارٍ التوجه لإتمام الشراء...");
                void navigate({ to: "/auth" });
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
            >
              <Zap className="h-4 w-4 fill-primary-foreground" /> شراء الآن
            </button>
          </div>
        </div>
      </div>

      {/* --- قسم واجهة المنتجات المشابهة --- */}
      {relatedProducts.length > 0 && (
        <div className="mt-10 pt-6 border-t border-border space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-foreground">منتجات قد تعجبك أيضاً</h3>
            <span className="text-xs text-muted-foreground">تشكيلة ممثالة</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => void navigate({ to: `/product/${rel.id}` })}
                className="w-36 shrink-0 rounded-2xl border border-border/80 bg-card p-2.5 space-y-2 cursor-pointer hover:border-primary transition-all"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={rel.images?.[0] || "/placeholder.svg"}
                    alt={rel.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="text-xs font-semibold text-foreground truncate">{rel.name}</h4>
                <p className="text-xs font-bold text-primary">{rel.price?.toLocaleString()} ر.ي</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- قسم التعليقات والتقييمات المباشر --- */}
      <ProductReviewsSection productId={product.id} />
    </div>
  );
}

// --- مكون التقييمات والتعليقات ---
function ProductReviewsSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (data) setReviews(data);
      setLoading(false);
    }
    if (productId) void fetchReviews();
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) {
      toast.error("يرجى إدخال اسمك والتعليق كاملاً");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("product_reviews").insert([
      {
        product_id: productId,
        user_name: name,
        rating,
        comment,
        is_approved: true,
      },
    ]);

    setSubmitting(false);

    if (error) {
      toast.error("تعذر إرسال التقييم: " + error.message);
    } else {
      toast.success("تم إضافة تقييمك بنجاح!");
      setName("");
      setComment("");

      // تحديث قائمة التقييمات فوراً
      const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (data) setReviews(data);
    }
  }

  return (
    <div className="mt-10 pt-6 border-t border-border space-y-6 dir-rtl">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <span>آراء وتقييمات العملاء</span>
        <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full text-muted-foreground font-normal">
          ({reviews.length})
        </span>
      </h3>

      {/* نموذج التقييم */}
      <form onSubmit={handleSubmit} className="p-4 rounded-3xl bg-secondary/40 border border-border/80 space-y-3">
        <h4 className="text-xs font-semibold text-foreground">شاركنا رأيك بالمنتج</h4>

        <div className="flex gap-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
              <Star className={`h-5 w-5 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <textarea
          rows={3}
          placeholder="اكتب تعليقك هنا..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          إرسال التقييم
        </button>
      </form>

      {/* التقييمات السابقة */}
      {loading ? (
        <p className="text-xs text-center text-muted-foreground animate-pulse">جارٍ تحميل التقييمات...</p>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground py-2">لا توجد تقييمات بعد. كن أول من يشاركنا رأيه!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3.5 rounded-2xl border border-border/70 bg-card space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground">{r.user_name}</span>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

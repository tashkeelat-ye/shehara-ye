import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Star,
  Send,
  Loader2,
  ArrowRight,
  ShoppingBag,
  Zap,
  Share2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/db";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // إدارات ومعرض الصور وسحب التاتش
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  // متغيرات لمعالجة السحب للتاتش (Swipe)
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    async function loadProductData() {
      setLoading(true);
      setActiveImageIndex(0);

      // 1. جلب بيانات المنتج الحالي
      const { data: currentProduct, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !currentProduct) {
        toast.error("تعذر تحميل بيانات المنتج");
        setLoading(false);
        return;
      }

      const prod = currentProduct as unknown as Product;
      setProduct(prod);

      // تعيين المقاس واللون الافتراضي إن وجد
      if (prod.sizes && prod.sizes.length > 0) setSelectedSize(prod.sizes[0]);
      if (prod.colors && prod.colors.length > 0) setSelectedColor(prod.colors[0]);

      // 2. جلب المنتجات المشابهة بنفس الفئة
      let query = supabase.from("products").select("*").neq("id", id).limit(6);
      if (prod.category_slug) {
        query = query.eq("category_slug", prod.category_slug);
      } else if (prod.category_id) {
        query = query.eq("category_id", prod.category_id);
      }

      const { data: related } = await query;
      if (related) {
        setSimilarProducts(related as unknown as Product[]);
      }

      setLoading(false);
    }

    if (id) void loadProductData();
  }, [id]);

  // دالة السحب للأجهزة المحمولة
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!product?.images || product.images.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe && activeImageIndex < product.images.length - 1) {
      setActiveImageIndex((prev) => prev + 1);
    }
    if (isRightSwipe && activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1);
    }
  };

  // دالة المشاركة
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط المنتج!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center dir-rtl">
        <p className="text-muted-foreground">المنتج غير موجود أو تم حذفه.</p>
      </div>
    );
  }

  const imagesList = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

  return (
    <div className="min-h-screen pb-24 dir-rtl bg-background text-foreground">
      {/* 1. القائمة العلوية الخاصة بواجهة المنتج (Top Header Bar) */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
        >
          <ArrowRight className="h-4 w-4" /> العودة
        </button>
        <span className="text-xs font-bold line-clamp-1 max-w-[200px]">{product.name}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full border border-border bg-card text-foreground hover:bg-secondary"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-4 space-y-6">
        {/* 2. معرض الصور المتفاعل يدعم التاتش والسحب */}
        <div className="space-y-3">
          <div
            className="relative aspect-square rounded-3xl overflow-hidden border border-border bg-secondary/20 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={imagesList[activeImageIndex]}
              alt={product.name}
              className="h-full w-full object-cover select-none transition-all duration-300"
            />

            {/* أسهم التنقل للكمبيوتر والموبايل */}
            {imagesList.length > 1 && (
              <>
                {activeImageIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => prev - 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                {activeImageIndex < imagesList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => prev + 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                
                {/* مؤشرات النقاط للسحب */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-1 rounded-full bg-black/30 backdrop-blur-md">
                  {imagesList.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        activeImageIndex === idx ? "w-5 bg-white" : "w-2 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* مصغرات الصور (Thumbnails) */}
          {imagesList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? "border-primary ring-2 ring-primary/20" : "border-border opacity-70"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. تفاصيل ومواصفات المنتج */}
        <div className="space-y-4 bg-card p-5 rounded-3xl border border-border/80">
          <div>
            <h1 className="text-xl font-bold text-foreground leading-snug">{product.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary">
                {product.price?.toLocaleString()} ر.ي
              </span>
              {product.original_price ? (
                <span className="text-sm text-muted-foreground line-through">
                  {product.original_price?.toLocaleString()} ر.ي
                </span>
              ) : null}
            </div>
          </div>

          {/* الخيارات: المقاسات */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-semibold text-foreground">اختر المقاس / الحجم:</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedSize === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* الخيارات: الألوان */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-semibold text-foreground">اختر اللون:</label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedColor === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-foreground border-border hover:bg-secondary/80"
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
            <div className="space-y-1 pt-3 border-t border-border/60">
              <p className="text-xs font-semibold text-foreground">التفاصيل والوصف:</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* 4. قسم المنتجات المشابهة المُطور */}
        {similarProducts.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                منتجات قد تعجبك أيضاً
              </h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {similarProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate({ to: `/product/$id`, params: { id: item.id } })}
                  className="w-36 shrink-0 rounded-2xl border border-border bg-card p-2 space-y-2 cursor-pointer hover:border-primary/50 transition-all"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-secondary/30">
                    <img
                      src={item.images?.[0] || "/placeholder.svg"}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">{item.name}</h4>
                  <p className="text-xs font-bold text-primary">{item.price?.toLocaleString()} ر.ي</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. قسم التعليقات والتقييمات */}
        <ProductReviewsSection productId={product.id} />
      </div>

      {/* 6. الشريط السفلي الثابت للوظائف الأساسية (Bottom App Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/90 backdrop-blur-lg border-t border-border shadow-2xl">
        <div className="container max-w-md mx-auto flex items-center gap-2">
          {/* زر أضف إلى السلة */}
          <button
            type="button"
            onClick={() => toast.success("تمت إضافة المنتج إلى السلة!")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-primary text-primary bg-primary/10 font-bold text-xs hover:bg-primary/20 transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            أضف للسلة
          </button>

          {/* زر شراء الآن */}
          <button
            type="button"
            onClick={() => {
              toast.success("جارٍ الانتقال لصفحة إتمام الطلب...");
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
          >
            <Zap className="h-4 w-4" />
            شراء الآن
          </button>
        </div>
      </div>
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
      toast.error("يرجى إدخال اسمك والتعليق كاملين");
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
    <div className="pt-6 border-t border-border space-y-5 dir-rtl">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <span>آراء وتقييمات العملاء</span>
        <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full text-muted-foreground font-normal">
          ({reviews.length})
        </span>
      </h3>

      {/* نموذج إضافة تقييم */}
      <form onSubmit={handleSubmit} className="p-4 rounded-3xl bg-card border border-border space-y-3">
        <h4 className="text-xs font-semibold text-foreground">شاركنا رأيك في هذا المنتج</h4>

        <div className="flex gap-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
              <Star
                className={`h-5 w-5 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none"
        />

        <textarea
          rows={3}
          placeholder="اكتب تعليقك هنا..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none"
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

      {/* قائمة التعليقات السابقة */}
      {loading ? (
        <p className="text-xs text-center text-muted-foreground animate-pulse">جارٍ تحميل التقييمات...</p>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground py-2">لا توجد تقييمات بعد. كن أول من يشاركنا رأيه!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3.5 rounded-2xl border border-border bg-card space-y-1.5 text-xs">
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
              <span className="text-[10px] text-muted-foreground/60 block pt-1">
                {new Date(r.created_at).toLocaleDateString("ar-YE")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

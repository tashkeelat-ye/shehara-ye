import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  
  // حالة معرض الصور والسحب
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  useEffect(() => {
    async function loadProductData() {
      setLoading(true);
      
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
      setActiveImageIndex(0);

      // 2. جلب المنتجات المشابهة من نفس الفئة
      if (prod.category_slug) {
        const { data: related } = await supabase
          .from("products")
          .select("*")
          .eq("category_slug", prod.category_slug)
          .neq("id", prod.id)
          .limit(6);

        if (related) {
          setRelatedProducts(related as unknown as Product[]);
        }
      }

      setLoading(false);
    }

    if (id) void loadProductData();
  }, [id]);

  // التحكم بسحب الصور باللمس (Swipe Handlers)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !product?.images?.length) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe && activeImageIndex < product.images.length - 1) {
      setActiveImageIndex((prev) => prev + 1);
    }
    if (isRightSwipe && activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleBuyNow = () => {
    toast.success("تم الانتقال لإتمام الطلب مباشرة!");
    void navigate({ to: "/checkout" });
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
      <div className="p-8 text-center dir-rtl">
        <p className="text-muted-foreground">المنتج غير موجود أو تم حذفه.</p>
      </div>
    );
  }

  const imagesList = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-8 dir-rtl">
      {/* زر العودة */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" /> العودة
      </button>

      {/* تفاصيل المنتج الأساسية والمعرض */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* معرض الصور مع دعم السحب يميناً ويساراً */}
        <div className="space-y-3">
          <div 
            className="relative aspect-square rounded-3xl overflow-hidden border border-border bg-secondary/30 touch-pan-y select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={imagesList[activeImageIndex]}
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-300 pointer-events-none"
            />

            {/* أزرار التنقل السريع */}
            {imagesList.length > 1 && (
              <>
                {activeImageIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => prev - 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {activeImageIndex < imagesList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => prev + 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                {/* نقاط المؤشر التفاعلية */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                  {imagesList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        activeImageIndex === idx ? "w-5 bg-white" : "w-2 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* المصغرات أسفل الصورة */}
          {imagesList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? "border-primary" : "border-border opacity-60"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* معلومات وخيارات الشراء */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
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

          {/* الخيارات: المقاسات */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">المقاس / الحجم:</label>
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

          {/* الخيارات: الألوان */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اللون:</label>
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

          {/* الوصف */}
          {product.description && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">وصف المنتج:</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* أزرار الإجراءات: شراء الآن + أضف للسلة */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 hover:opacity-95 transition-opacity"
            >
              <Zap className="h-4 w-4 fill-white" /> شراء الآن
            </button>
            <button
              type="button"
              onClick={() => toast.success("تمت إضافة المنتج إلى السلة!")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
            >
              <ShoppingBag className="h-4 w-4" /> أضف إلى السلة
            </button>
          </div>
        </div>
      </div>

      {/* --- قسم المنتجات المشابهة --- */}
      {relatedProducts.length > 0 && (
        <div className="pt-6 border-t border-border space-y-4">
          <h3 className="text-base font-bold text-foreground">منتجات مشابهة قد تعجبك</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {relatedProducts.map((rel) => (
              <Link
                key={rel.id}
                to="/product/$id"
                params={{ id: rel.id }}
                className="group rounded-2xl border border-border p-2.5 bg-card hover:border-primary/50 transition-all space-y-2 block"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={rel.images?.[0] || "/placeholder.svg"}
                    alt={rel.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs font-bold text-foreground truncate">{rel.name}</p>
                <p className="text-xs font-extrabold text-primary">{rel.price?.toLocaleString()} ر.ي</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* --- قسم التعليقات والتقييمات --- */}
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
    <div className="pt-6 border-t border-border space-y-6 dir-rtl">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <span>آراء وتقييمات العملاء</span>
        <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full text-muted-foreground font-normal">
          ({reviews.length})
        </span>
      </h3>

      <form onSubmit={handleSubmit} className="p-4 rounded-3xl bg-secondary/40 border border-border/80 space-y-3">
        <h4 className="text-xs font-semibold text-foreground">شاركونا رأيكم بالمنتج</h4>

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
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none"
        />

        <textarea
          rows={3}
          placeholder="اكتب تعليقك هنا..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          إرسال التقييم
        </button>
      </form>

      {loading ? (
        <p className="text-xs text-center text-muted-foreground animate-pulse">جارٍ تحميل التقييمات...</p>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground py-2">لا توجد تقييمات بعد.</p>
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

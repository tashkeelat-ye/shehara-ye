import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Send, Loader2, ArrowRight, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/db";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast.error("تعذر تحميل بيانات المنتج");
      } else if (data) {
        setProduct(data as unknown as Product);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        }
      }
      setLoading(false);
    }

    if (id) void loadProduct();
  }, [id]);

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

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6 dir-rtl">
      {/* زر العودة */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" /> العودة للرئيسية
      </button>

      {/* تفاصيل المنتج الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معرض الصور */}
        <div className="space-y-3">
          <div className="aspect-square rounded-3xl overflow-hidden border border-border bg-secondary/30">
            <img
              src={selectedImage || product.images?.[0] || "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? "border-primary" : "border-border opacity-70"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* تفاصيل ومعلومات المنتج */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-primary">
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

          {/* زر الشراء */}
          <button
            type="button"
            onClick={() => toast.success("تمت إضافة المنتج إلى السلة!")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
          >
            <ShoppingBag className="h-4 w-4" /> أضف إلى السلة
          </button>
        </div>
      </div>

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

      // تحديث القائمة فوراً
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

      {/* نموذج إضافة تقييم */}
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

      {/* قائمة التعليقات السابقة */}
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

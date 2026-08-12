import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Star, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard } from "@/components/admin-ui";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

type Review = {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
  products?: { name: string } | null;
};

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*, products(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذر جلب التعليقات: " + error.message);
    } else {
      setReviews((data as unknown as Review[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function toggleApproval(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: !currentStatus } as never)
      .eq("id", id);

    if (error) {
      toast.error("تعذر تحديث الحالة: " + error.message);
    } else {
      toast.success(currentStatus ? "تم إخفاء التعليق" : "تمت الموافقة على التعليق");
      await loadReviews();
    }
  }

  async function removeReview(id: string) {
    if (!window.confirm("هل أنت تأكد من حذف هذا التعليق؟")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) {
      toast.error("تعذر الحذف: " + error.message);
    } else {
      toast.success("تم حذف التعليق بنجاح");
      await loadReviews();
    }
  }

  return (
    <div className="space-y-4 dir-rtl">
      <AdminCard title={`إدارة تعليقات وتقييمات العملاء (${reviews.length})`}>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">لا توجد تعليقات حالياً.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-3 text-xs bg-card space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div>
                    <span className="font-bold text-foreground">{r.user_name}</span>
                    <span className="text-muted-foreground text-[10px] mr-2">
                      على المنتج: <strong className="text-primary">{r.products?.name || "منتج عام"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-foreground/90">{r.comment}</p>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ar-YE")}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleApproval(r.id, r.is_approved)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
                        r.is_approved
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {r.is_approved ? (
                        <>
                          <CheckCircle className="h-3 w-3" /> منشور
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> مخفي
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void removeReview(r.id)}
                      className="grid h-7 w-7 place-items-center rounded-xl border border-destructive/30 text-destructive bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
                                }
                          

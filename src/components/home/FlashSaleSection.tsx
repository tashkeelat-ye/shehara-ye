import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Zap, Clock, ShoppingBag, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type FlashSaleItem = {
  id: string;
  discount_percentage: number;
  ends_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    old_price: number | null;
    images: string[];
    stock_left: number;
    total_stock: number;
  };
};

export function FlashSaleSection() {
  const [sales, setSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function fetchFlashSales() {
      try {
        const { data, error } = await supabase
          .from("flash_sales")
          .select(`
            id,
            discount_percentage,
            ends_at,
            product:products (
              id, name, price, old_price, images, stock_left, total_stock
            )
          `)
          .eq("is_active", true)
          .gt("ends_at", new Date().toISOString())
          .limit(4);

        if (!error && data) {
          const validSales = data.filter((item) => item.product) as unknown as FlashSaleItem[];
          setSales(validSales);
        }
      } catch (err) {
        console.warn("Could not load flash sales:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchFlashSales();
  }, []);

  useEffect(() => {
    if (sales.length === 0) return;

    const targetDate = new Date(sales[0].ends_at).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sales]);

  if (loading) {
    return (
      <div className="py-8 container px-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (sales.length === 0) return null;

  return (
    <section className="py-8 bg-gradient-to-b from-destructive/5 via-background to-background">
      <div className="container px-4">
        
        {/* العناوين والعداد */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 text-destructive rounded-xl animate-pulse">
              <Zap className="h-6 w-6 fill-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">عروض خاطفة</h2>
              <p className="text-xs text-muted-foreground">خصومات لفترة محدودة، سارع قبل نفاذ الكمية!</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-background border px-3 py-1.5 rounded-full shadow-sm text-xs font-bold">
            <Clock className="h-4 w-4 text-destructive" />
            <span>ينتهي خلال:</span>
            <span className="bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
              {String(timeLeft.hours).padStart(2, "0")}
            </span>
            <span>:</span>
            <span className="bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
              {String(timeLeft.minutes).padStart(2, "0")}
            </span>
            <span>:</span>
            <span className="bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
              {String(timeLeft.seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* شبكة المنتجات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sales.map(({ id, discount_percentage, product }) => {
            const stockLeft = product.stock_left ?? 5;
            const totalStock = product.total_stock ?? 20;
            const progressValue = Math.min(100, Math.max(0, ((totalStock - stockLeft) / totalStock) * 100));

            return (
              <div
                key={id}
                className="group relative bg-card border rounded-2xl p-3 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted mb-3">
                  <img
                    src={product.images?.[0] || "/placeholder.svg"}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground font-bold text-xs">
                    -{discount_percentage}%
                  </Badge>

                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur text-foreground hover:text-destructive transition-colors"
                  >
                    <Heart
                      className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-destructive text-destructive" : ""}`}
                    />
                  </button>
                </div>

                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to="/product/$productId"
                      params={{ productId: product.id }}
                      className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-bold text-base text-primary">
                        {product.price.toLocaleString()} ر.ي
                      </span>
                      {product.old_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {product.old_price.toLocaleString()} ر.ي
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>تم بيع الأكثرية</span>
                      <span>متبقي {stockLeft} فقط</span>
                    </div>
                    <Progress value={progressValue} className="h-1.5 bg-muted" />
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-2 rounded-xl gap-1.5"
                    onClick={() => addItem({ productId: product.id, openDrawer: true })}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>إضافة للسلة</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

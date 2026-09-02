import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/db";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

export function LocalProducts() {
  const formatPrice = useFormatPrice();
  const { data: products = [] } = useQuery({
    queryKey: ["products", "local"],
    queryFn: () => fetchProducts({ local: true, sort: "best", limit: 6 }),
  });

  return (
    <section className="mt-8 bg-brand-gradient py-7">
      <div className="px-4">
        <p className="text-[11px] text-primary-foreground/80">صناعة يمنية أصيلة</p>
        <h2 className="mt-1 text-lg text-primary-foreground sm:text-xl">
          منتجات يمنية محلية
        </h2>
        <p className="mt-1 max-w-md text-xs text-primary-foreground/80">
          عسل، بخور، وحرف يدوية مختارة بعناية من مناطق مختلفة في اليمن
        </p>
      </div>

      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-3 md:overflow-visible">
        {products.map((product) => (
          <Link
            key={product.id}
            to="/product/$id"
            params={{ id: product.id }}
            className="flex w-64 shrink-0 gap-3 rounded-2xl bg-card p-3 shadow-card md:w-auto"
          >
            <ProductImage
              src={product.images[0]}
              alt={product.name}
              className="h-24 w-24 shrink-0 rounded-xl"
            />
            <div className="flex min-w-0 flex-col gap-1">
              {product.badge ? (
                <span className="w-fit rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-primary">
                  {product.badge}
                </span>
              ) : null}
              <h3 className="line-clamp-2 text-[13px] leading-tight text-foreground">
                {product.name}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-accent-solid text-accent-solid" />
                {Number(product.rating).toLocaleString("ar-EG")}
              </div>
              <p className="mt-auto text-sm text-primary">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

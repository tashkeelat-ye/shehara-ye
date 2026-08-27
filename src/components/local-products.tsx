import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Coffee,
  Gem,
  Heart,
  Star,
} from "lucide-react";

import { fetchProducts } from "@/lib/db";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

export function LocalProducts() {
  const formatPrice =
    useFormatPrice();

  const {
    data: products = [],
    isLoading,
  } = useQuery({
    queryKey: [
      "products",
      "local",
      "featured",
    ],
    queryFn: () =>
      fetchProducts({
        local: true,
        sort: "best",
        limit: 6,
      }),
    staleTime:
      1000 * 60 * 5,
  });

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0E4D64] p-4 text-white shadow-[0_24px_55px_-35px_rgba(14,77,100,0.8)] sm:p-6">
      <div className="absolute -end-20 -top-20 h-56 w-56 rounded-full border border-white/10" />
      <div className="absolute -start-24 -bottom-24 h-64 w-64 rounded-full border border-[#D65A31]/15" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D65A31]">
                <Heart className="h-4 w-4" />
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-bold text-white/80">
                صناعة يمنية أصيلة
              </span>
            </div>

            <h2 className="mt-4 text-xl font-black sm:text-2xl">
              من اليمن... إلى بيتك
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-6 text-white/70">
              منتجات محلية مختارة بعناية،
              تجمع أصالة المنتج اليمني
              مع تجربة التسوق الحديثة.
            </p>
          </div>

          <Link
            to="/products"
            className="hidden shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-white/15 sm:inline-flex"
          >
            عرض الكل
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({
                length: 3,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-white/10"
                />
              ))
            : products.map(
                (product) => (
                  <Link
                    key={product.id}
                    to="/product/$id"
                    params={{
                      id: product.id,
                    }}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white p-3 text-foreground shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.985]"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[#FAF9F6]">
                        <ProductImage
                          src={
                            product.images[0]
                          }
                          alt={
                            product.name
                          }
                          className="h-full w-full"
                        />

                        {product.badge ? (
                          <span className="absolute start-1.5 top-1.5 rounded-full bg-[#D65A31] px-2 py-1 text-[8px] font-bold text-white">
                            {product.badge}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-1 text-[#0E4D64]">
                          {product.name
                            .includes(
                              "بن",
                            ) ? (
                            <Coffee className="h-3.5 w-3.5" />
                          ) : product.name.includes(
                              "فض",
                            ) ? (
                            <Gem className="h-3.5 w-3.5" />
                          ) : null}

                          <span className="text-[9px] font-bold">
                            منتج يمني
                          </span>
                        </div>

                        <h3 className="mt-1 line-clamp-2 text-xs font-black leading-5">
                          {product.name}
                        </h3>

                        <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-[#D65A31] text-[#D65A31]" />

                          <span>
                            {Number(
                              product.rating,
                            ).toLocaleString(
                              "ar-EG",
                            )}
                          </span>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-2">
                          <p className="text-sm font-black text-[#0E4D64]">
                            {formatPrice(
                              product.price,
                            )}
                          </p>

                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#D65A31] text-white transition active:scale-90">
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ),
              )}
        </div>

        <Link
          to="/products"
          className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold text-white sm:hidden"
        >
          اكتشف المنتجات اليمنية
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

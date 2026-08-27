import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { fetchProducts } from "@/lib/db";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

export function LocalProducts() {
  const formatPrice =
    useFormatPrice();

  const {
    data: products = [],
  } = useQuery({
    queryKey: [
      "products",
      "local",
    ],
    queryFn: () =>
      fetchProducts({
        local: true,
        sort: "best",
        limit: 6,
      }),
  });

  return (
    <section
      className="
        overflow-hidden
        rounded-[1.75rem]
        bg-[#0E4D64]
        px-4
        py-7
        text-white
        shadow-[0_20px_45px_-30px_rgba(14,77,100,0.75)]
      "
    >
      <div className="max-w-2xl">
        <span
          className="
            inline-flex
            rounded-full
            bg-[#D65A31]/15
            px-3
            py-1
            text-[10px]
            font-bold
            text-[#F6B39B]
          "
        >
          صناعة يمنية أصيلة
        </span>

        <h2
          className="
            mt-3
            text-xl
            font-extrabold
            sm:text-2xl
          "
        >
          منتجات يمنية أصيلة
        </h2>

        <p
          className="
            mt-2
            max-w-xl
            text-xs
            leading-6
            text-white/75
          "
        >
          عسل، بن يمني، فضيات،
          بخور وحرف يدوية مختارة
          بعناية من مختلف مناطق
          اليمن.
        </p>
      </div>

      <div
        className="
          no-scrollbar
          mt-5
          grid
          gap-3
          overflow-x-auto
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {products.map(
          (product) => (
            <Link
              key={product.id}
              to="/product/$id"
              params={{
                id: product.id,
              }}
              className="
                group
                flex
                gap-3
                rounded-2xl
                border
                border-white/10
                bg-white
                p-3
                text-foreground
                shadow-[0_10px_25px_-20px_rgba(0,0,0,0.5)]
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:shadow-xl
                active:scale-[0.985]
              "
            >
              <ProductImage
                src={
                  product.images[0]
                }
                alt={product.name}
                className="
                  h-24
                  w-24
                  shrink-0
                  rounded-xl
                "
              />

              <div
                className="
                  flex
                  min-w-0
                  flex-1
                  flex-col
                  gap-1
                "
              >
                {product.badge ? (
                  <span
                    className="
                      w-fit
                      rounded-full
                      bg-[#D65A31]/10
                      px-2
                      py-0.5
                      text-[9px]
                      font-bold
                      text-[#D65A31]
                    "
                  >
                    {product.badge}
                  </span>
                ) : null}

                <h3
                  className="
                    line-clamp-2
                    text-[12px]
                    font-bold
                    leading-5
                  "
                >
                  {product.name}
                </h3>

                <div
                  className="
                    flex
                    items-center
                    gap-1
                    text-[10px]
                    text-muted-foreground
                  "
                >
                  <Star
                    className="
                      h-3.5
                      w-3.5
                      fill-[#D65A31]
                      text-[#D65A31]
                    "
                  />

                  {Number(
                    product.rating,
                  ).toLocaleString(
                    "ar-EG",
                  )}
                </div>

                <p
                  className="
                    mt-auto
                    text-sm
                    font-extrabold
                    text-[#0E4D64]
                  "
                >
                  {formatPrice(
                    product.price,
                  )}
                </p>
              </div>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

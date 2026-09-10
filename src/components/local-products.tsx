import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { fetchProducts } from "@/lib/db";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";
import { AutoScrollRow } from "@/components/home/auto-scroll-row";

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
    ],
    queryFn: () =>
      fetchProducts({
        local: true,
        sort: "best",
        limit: 12,
      }),
    staleTime:
      1000 * 60 * 5,
  });

  if (
    !isLoading &&
    products.length === 0
  ) {
    return null;
  }

  return (
    <section
      dir="rtl"
      className="
        relative
        overflow-hidden
        bg-gradient-to-br
        from-[#0D3B4D]
        via-[#0A2A38]
        to-[#071B24]
        py-8
      "
    >
      {/* زخرفة الهوية */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -end-20
          -top-20
          h-56
          w-56
          rotate-45
          rounded-[3rem]
          border
          border-[#E2723A]/10
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-24
          -start-16
          h-64
          w-64
          rounded-full
          bg-[#E2723A]/5
          blur-3xl
        "
      />

      {/* الرأس */}
      <div className="
        relative
        z-10
        mb-5
        flex
        items-end
        justify-between
        gap-4
        px-4
      ">
        <div className="min-w-0">
          <div className="
            mb-2
            flex
            items-center
            gap-2
          ">
            <span
              className="
                grid
                h-8
                w-8
                place-items-center
                rounded-xl
                bg-[#E2723A]/15
                text-[#E2723A]
              "
            >
              <ShieldCheck
                className="h-4 w-4"
              />
            </span>

            <span
              className="
                text-[10px]
                font-bold
                tracking-wide
                text-[#F6F2EE]/65
              "
            >
              صناعة يمنية أصيلة
            </span>
          </div>

          <h2
            className="
              text-xl
              font-extrabold
              tracking-tight
              text-[#F6F2EE]
              sm:text-2xl
            "
          >
            منتجات يمنية
          </h2>

          <p
            className="
              mt-1
              max-w-md
              text-xs
              leading-6
              text-[#F6F2EE]/65
            "
          >
            مختارات أصيلة من اليمن
            تصل إليك بعناية
          </p>
        </div>

        <Link
          to="/products"
          className="
            flex
            shrink-0
            items-center
            gap-1
            rounded-full
            border
            border-[#E2723A]/20
            bg-[#F6F2EE]/5
            px-3
            py-2
            text-[10px]
            font-bold
            text-[#F6F2EE]
            backdrop-blur-sm
            transition
            hover:bg-[#E2723A]/15
          "
        >
          عرض الكل
          <ArrowLeft
            className="h-3.5 w-3.5"
          />
        </Link>
      </div>

      {/* المنتجات */}
      {isLoading ? (
        <AutoScrollRow
          speed={0.28}
          ariaLabel="المنتجات اليمنية"
          className="relative z-10 px-4 pb-2"
        >
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-40
                w-[270px]
                shrink-0
                animate-pulse
                rounded-3xl
                bg-white/10
              "
            />
          ))}
        </AutoScrollRow>
      ) : (
        <AutoScrollRow
          speed={0.28}
          ariaLabel="المنتجات اليمنية"
          className="relative z-10 px-4 pb-2"
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
                  w-[278px]
                  shrink-0
                  gap-3
                  rounded-3xl
                  border
                  border-white/8
                  bg-white/[0.07]
                  p-3
                  backdrop-blur-md
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[#E2723A]/25
                  hover:bg-white/[0.1]
                  active:scale-[0.98]
                "
              >
                <div
                  className="
                    relative
                    h-28
                    w-28
                    shrink-0
                    overflow-hidden
                    rounded-2xl
                    bg-[#F6F2EE]
                  "
                >
                  <ProductImage
                    src={
                      product
                        .images?.[0]
                    }
                    alt={
                      product.name
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                      transition-transform
                      duration-500
                      group-hover:scale-105
                    "
                  />

                  <span
                    className="
                      absolute
                      bottom-2
                      start-2
                      rounded-full
                      bg-[#0D3B4D]/90
                      px-2
                      py-1
                      text-[8px]
                      font-bold
                      text-[#F6F2EE]
                    "
                  >
                    يمني
                  </span>
                </div>

                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    flex-col
                    py-1
                  "
                >
                  {product.badge ? (
                    <span
                      className="
                        mb-1
                        w-fit
                        rounded-full
                        bg-[#E2723A]/15
                        px-2
                        py-1
                        text-[8px]
                        font-bold
                        text-[#E2723A]
                      "
                    >
                      {
                        product.badge
                      }
                    </span>
                  ) : null}

                  <h3
                    className="
                      line-clamp-2
                      text-[13px]
                      font-bold
                      leading-5
                      text-[#F6F2EE]
                    "
                  >
                    {
                      product.name
                    }
                  </h3>

                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      gap-1
                      text-[10px]
                      text-[#F6F2EE]/55
                    "
                  >
                    <Star
                      className="
                        h-3.5
                        w-3.5
                        fill-[#E2723A]
                        text-[#E2723A]
                      "
                    />

                    {Number(
                      product.rating,
                    ).toLocaleString(
                      "ar-EG",
                    )}

                    <span className="mx-0.5">
                      •
                    </span>

                    <MapPin className="h-3 w-3" />

                    اليمن
                  </div>

                  <p
                    className="
                      mt-auto
                      pt-2
                      text-sm
                      font-extrabold
                      text-[#E2723A]
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
        </AutoScrollRow>
      )}
    </section>
  );
}

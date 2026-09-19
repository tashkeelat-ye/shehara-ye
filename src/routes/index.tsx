import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  HomePage,
} from "@/components/home/HomePage";

export const Route =
  createFileRoute("/")({
    head: () => ({
      meta: [
        {
          title:
            "شهارة | متجر يمني إلكتروني لكل احتياجاتك",
        },
        {
          name: "description",
          content:
            "شهارة متجر إلكتروني يمني للتسوق بسهولة وأمان، مع تشكيلة متنوعة من المنتجات والعروض والتجار والمنتجات المحلية.",
        },
        {
          property: "og:title",
          content:
            "شهارة | تسوق بلا حدود",
        },
        {
          property: "og:description",
          content:
            "تسوّق من شهارة واكتشف المنتجات والعروض والتجار والمنتجات المحلية.",
        },
      ],
    }),
    component: HomePage,
  });

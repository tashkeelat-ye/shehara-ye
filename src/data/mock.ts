import abaya from "@/assets/p-abaya.jpg";
import headphones from "@/assets/p-headphones.jpg";
import cookware from "@/assets/p-cookware.jpg";
import serum from "@/assets/p-serum.jpg";
import honey from "@/assets/p-honey.jpg";
import oud from "@/assets/p-oud.jpg";
import craft from "@/assets/p-craft.jpg";

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
};

export const categories = [
  { id: "fashion", name: "أزياء", icon: "Shirt" },
  { id: "electronics", name: "إلكترونيات", icon: "Smartphone" },
  { id: "home", name: "منزل ومطبخ", icon: "CookingPot" },
  { id: "beauty", name: "جمال وعناية", icon: "Sparkles" },
  { id: "grocery", name: "مواد غذائية", icon: "ShoppingBasket" },
  { id: "accessories", name: "إكسسوارات", icon: "Watch" },
  { id: "furniture", name: "أثاث وديكور", icon: "Lamp" },
  { id: "local", name: "منتجات يمنية", icon: "Landmark" },
] as const;

export const bestSellers: Product[] = [
  {
    id: "1",
    name: "عباية مطرزة فخمة – قماش كريب",
    price: 18500,
    oldPrice: 24000,
    rating: 4.8,
    reviews: 126,
    image: abaya,
    badge: "خصم ٢٣٪",
  },
  {
    id: "2",
    name: "سماعة بلوتوث لاسلكية عازلة للضوضاء",
    price: 32000,
    oldPrice: 39000,
    rating: 4.6,
    reviews: 89,
    image: headphones,
    badge: "الأكثر طلبًا",
  },
  {
    id: "3",
    name: "طقم أواني طهي غير لاصق – ٦ قطع",
    price: 45000,
    rating: 4.7,
    reviews: 54,
    image: cookware,
  },
  {
    id: "4",
    name: "سيروم مرطب للوجه بفيتامين سي",
    price: 9800,
    oldPrice: 12500,
    rating: 4.9,
    reviews: 211,
    image: serum,
    badge: "جديد",
  },
];

export const localProducts: Product[] = [
  {
    id: "l1",
    name: "عسل سدر دوعني أصلي – ١ كجم",
    price: 55000,
    rating: 5,
    reviews: 342,
    image: honey,
    badge: "حضرموت",
  },
  {
    id: "l2",
    name: "بخور عود يمني مع مبخرة نحاسية",
    price: 14500,
    rating: 4.8,
    reviews: 97,
    image: oud,
    badge: "صنعاء",
  },
  {
    id: "l3",
    name: "سلة خوص مصنوعة يدويًا بنقوش تقليدية",
    price: 7500,
    rating: 4.7,
    reviews: 41,
    image: craft,
    badge: "حرف يدوية",
  },
];

export const slides = [
  {
    id: "s1",
    title: "تشكيلة الصيف",
    subtitle: "خصومات تصل إلى ٥٠٪ على الأزياء والإكسسوارات",
    cta: "اكتشف العروض",
  },
  {
    id: "s2",
    title: "توصيل لكل المحافظات",
    subtitle: "شحن مجاني للطلبات فوق ٢٥٠٠٠ ريال",
    cta: "ابدأ التسوق",
  },
  {
    id: "s3",
    title: "منتجات يمنية أصلية",
    subtitle: "عسل، بخور، وحرف يدوية من قلب اليمن",
    cta: "تصفح المحلي",
  },
];

export const formatPrice = (value: number) =>
  `${value.toLocaleString("ar-EG")} ر.ي`;

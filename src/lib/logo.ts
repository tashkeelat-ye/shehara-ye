/**
 * =========================================================
 * تشكيلات للتسوق — الهوية الرسمية
 * =========================================================
 *
 * هذا الملف هو المصدر المركزي لبيانات الهوية المستخدمة
 * داخل واجهة المتجر.
 *
 * ملاحظة:
 * - لا يتم إنشاء الشعار من CSS.
 * - الشعار الرسمي موجود داخل public.
 * - نحافظ على مسار /logo.png حتى لا تنكسر المكونات
 *   الحالية التي تعتمد على LOGO_URL.
 * =========================================================
 */

/**
 * المسار الرسمي للشعار الكامل.
 */
export const LOGO_URL = "/logo.png";

/**
 * الاسم الرسمي للعلامة.
 */
export const BRAND_NAME = "تشكيلات";

/**
 * الاسم المستخدم في العناوين والوصف.
 */
export const BRAND_FULL_NAME =
  "تشكيلات للتسوق";

/**
 * الشعار النصي الرسمي.
 */
export const STORE_TAGLINE =
  "كل ما تحتاجه... في مكان واحد";

/**
 * الشعار النصي البديل المستخدم في بعض المساحات
 * التي تحتاج صياغة أقصر.
 */
export const STORE_SHORT_TAGLINE =
  "كل ما تحتاجه... بتشكيلة واحدة";

/**
 * الوصف المختصر للعلامة.
 */
export const BRAND_DESCRIPTION =
  "تشكيلات — متجر إلكتروني يمني يجمع احتياجاتك في مكان واحد.";

/**
 * النص البديل القياسي للشعار.
 */
export const LOGO_ALT =
  "شعار تشكيلات للتسوق";

/**
 * الألوان الأساسية الرسمية.
 *
 * تحفظ هنا أيضاً حتى تكون هناك نقطة مرجعية واحدة
 * للمكونات التي تحتاج اللون خارج CSS.
 */
export const BRAND_COLORS = {
  burgundy: "#4A1525",
  burgundyDeep: "#35101C",
  burgundySoft: "#6A263A",

  gold: "#E0B85C",
  goldDeep: "#C99A3B",
  goldSoft: "#F2D58B",

  cream: "#FBF7EF",
  paper: "#F8F2E7",
} as const;

/**
 * إعدادات الشعار القياسية.
 */
export const BRAND_LOGO_CONFIG = {
  src: LOGO_URL,
  alt: LOGO_ALT,

  /**
   * أحجام مناسبة للاستخدام في:
   *
   * - Header
   * - Mobile Header
   * - صفحات الدخول
   * - PWA
   */
  sizes: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 64,
    xl: 96,
  },

  /**
   * مظهر الحواف القياسي.
   */
  radiusClass:
    "rounded-xl",

  /**
   * خلفية العلامة.
   */
  backgroundColor:
    BRAND_COLORS.burgundy,

  /**
   * إطار الهوية.
   */
  borderColor:
    BRAND_COLORS.gold,
} as const;

/**
 * عناصر الهوية البصرية المستخدمة كمرجع
 * للمكونات الجديدة.
 *
 * هذه ليست صوراً إضافية؛ وإنما أسماء دلالية
 * حتى تبقى المكونات متسقة مع دليل الهوية.
 */
export const BRAND_VISUAL_LANGUAGE = {
  primary: "burgundy-gold",

  background:
    "yemeni-heritage-watermark",

  architecture:
    "yemeni-architecture",

  ornament:
    "yemeni-geometric-ornament",

  icon:
    "shopping-bag",

  surface:
    "warm-paper",

  frame:
    "thin-gold-frame",
} as const;

/**
 * التأكد من أن مسار الشعار يبقى ثابتاً
 * أثناء البناء والإنتاج.
 */
export function getLogoUrl(): string {
  return LOGO_URL;
}

/**
 * إرجاع الاسم الكامل للعلامة.
 */
export function getBrandName(): string {
  return BRAND_FULL_NAME;
}

/**
 * إرجاع الشعار النصي الرسمي.
 */
export function getStoreTagline(): string {
  return STORE_TAGLINE;
}

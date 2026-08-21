/**
 * =========================================================
 * تشكيلات للتسوق — الهوية الرسمية
 * =========================================================
 *
 * هذا الملف هو المصدر المركزي للهوية البصرية والتجارية
 * المستخدمة داخل واجهة متجر تشكيلات.
 *
 * القاعدة الأساسية:
 *
 * - لا يتم تكرار ألوان الهوية داخل المكونات.
 * - لا يتم إنشاء الشعار من CSS.
 * - الشعار الرسمي موجود داخل public/logo.png.
 * - جميع المكونات الجديدة تعتمد على BRAND_COLORS
 *   و BRAND_DESIGN_TOKENS.
 * - الهوية الأساسية:
 *      عنابي + ذهبي + ورقي دافئ
 * - العناصر التراثية تستخدم كعلامات مائية منخفضة
 *   الشفافية ولا تنافس المحتوى.
 *
 * =========================================================
 */

/**
 * =========================================================
 * الشعار
 * =========================================================
 */

/**
 * المسار الرسمي للشعار الكامل.
 *
 * يجب عدم تغييره إلا إذا تغير ملف الشعار الرسمي
 * داخل public.
 */
export const LOGO_URL = "/logo.png";

/**
 * الاسم الرسمي للعلامة.
 */
export const BRAND_NAME = "تشكيلات";

/**
 * الاسم الكامل المستخدم في العناوين والوصف.
 */
export const BRAND_FULL_NAME =
  "تشكيلات للتسوق";

/**
 * الشعار النصي الرسمي.
 */
export const STORE_TAGLINE =
  "كل ما تحتاجه... في مكان واحد";

/**
 * الشعار النصي المختصر.
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
 * =========================================================
 * ألوان الهوية الرسمية
 * =========================================================
 *
 * هذه هي نقطة المرجع الأساسية لكل الواجهات.
 *
 * Burgundy:
 * اللون الرئيسي للعلامة.
 *
 * Gold:
 * اللون الثانوي والفاخر المستخدم في:
 * - الحدود
 * - الأيقونات المهمة
 * - المؤشرات
 * - التفاصيل
 *
 * Cream / Paper:
 * الأسطح الدافئة في الوضع النهاري.
 */

export const BRAND_COLORS = {
  burgundy:
    "#4A1525",

  burgundyDeep:
    "#35101C",

  burgundySoft:
    "#6A263A",

  burgundyLight:
    "#7B354A",

  burgundyDark:
    "#260B14",

  gold:
    "#E0B85C",

  goldDeep:
    "#C99A3B",

  goldSoft:
    "#F2D58B",

  goldLight:
    "#F7E6B3",

  cream:
    "#FBF7EF",

  paper:
    "#F8F2E7",

  paperDeep:
    "#EFE4D2",

  white:
    "#FFFFFF",

  black:
    "#160A0F",
} as const;

/**
 * =========================================================
 * ألوان الوضع الليلي
 * =========================================================
 */

export const BRAND_DARK_COLORS = {
  background:
    "#170C11",

  surface:
    "#211117",

  surfaceElevated:
    "#29141B",

  surfaceSoft:
    "#321923",

  text:
    "#FBF7EF",

  textMuted:
    "#CDBFC3",

  border:
    "#E0B85C",

  borderSoft:
    "#E0B85C",

  primary:
    "#E0B85C",

  primaryDeep:
    "#C99A3B",

  burgundy:
    "#4A1525",
} as const;

/**
 * =========================================================
 * أحجام الهوية
 * =========================================================
 */

export const BRAND_LOGO_CONFIG = {
  src: LOGO_URL,

  alt: LOGO_ALT,

  sizes: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 64,
    xl: 96,
    hero: 128,
  },

  radiusClass:
    "rounded-xl",

  backgroundColor:
    BRAND_COLORS.burgundy,

  borderColor:
    BRAND_COLORS.gold,
} as const;

/**
 * =========================================================
 * طبقات الهوية البصرية
 * =========================================================
 *
 * تستخدم هذه القيم عندما نحتاج إلى بناء واجهة تحمل
 * الهوية دون تكرار قيم الشفافية في كل مكون.
 */

export const BRAND_OPACITY = {
  /**
   * حدود ذهبية شديدة الخفة.
   */
  goldBorder:
    0.15,

  /**
   * زخرفة مرئية ولكن خافتة.
   */
  ornament:
    0.07,

  /**
   * العلامة المائية الرئيسية.
   */
  watermark:
    0.045,

  /**
   * العلامة المائية المعمارية.
   */
  architecture:
    0.035,

  /**
   * الخلفية الذهبية الخفيفة.
   */
  goldSurface:
    0.06,

  /**
   * طبقة العنابي الخفيفة.
   */
  burgundySurface:
    0.045,

  /**
   * خطوط التفاصيل.
   */
  detail:
    0.22,
} as const;

/**
 * =========================================================
 * الزخارف التراثية
 * =========================================================
 *
 * القيم هنا أسماء دلالية وليست صوراً.
 *
 * الهدف:
 * أن تستطيع المكونات اختيار لغة زخرفية موحدة
 * دون إنشاء تصميم مختلف لكل صفحة.
 */

export const BRAND_ORNAMENTS = {
  geometric:
    "yemeni-geometric-ornament",

  heritage:
    "yemeni-heritage-pattern",

  architecture:
    "yemeni-architecture",

  diamond:
    "heritage-diamond",

  frame:
    "thin-gold-frame",

  corner:
    "heritage-corner",

  grid:
    "heritage-grid",

  arches:
    "yemeni-architectural-arches",
} as const;

/**
 * =========================================================
 * خلفيات التطبيق
 * =========================================================
 *
 * تستخدم كطبقات خفيفة خلف المحتوى.
 *
 * مهم:
 * لا تستخدم هذه الطبقات لتغطية النصوص أو المنتجات.
 */

export const BRAND_BACKGROUND_CONFIG = {
  /**
   * الخلفية الأساسية للوضع النهاري.
   */
  light:
    BRAND_COLORS.cream,

  /**
   * الخلفية الأساسية للوضع الليلي.
   */
  dark:
    BRAND_DARK_COLORS.background,

  /**
   * لون العلامة المائية.
   */
  watermarkColor:
    BRAND_COLORS.gold,

  /**
   * شفافية العلامة المائية.
   */
  watermarkOpacity:
    BRAND_OPACITY.watermark,

  /**
   * شفافية العمارة اليمنية.
   */
  architectureOpacity:
    BRAND_OPACITY.architecture,

  /**
   * شفافية الزخرفة.
   */
  ornamentOpacity:
    BRAND_OPACITY.ornament,

  /**
   * موضع افتراضي للعلامة المائية.
   */
  watermarkPosition:
    "background-center",

  /**
   * حجم الزخرفة.
   */
  ornamentSize:
    "large",
} as const;

/**
 * =========================================================
 * الإطارات والبطاقات
 * =========================================================
 */

export const BRAND_SURFACE_CONFIG = {
  /**
   * بطاقة أساسية.
   */
  card: {
    radius:
      "rounded-2xl",

    border:
      "border-[#E0B85C]/15",

    background:
      "bg-white/70",

    darkBackground:
      "dark:bg-white/[0.035]",
  },

  /**
   * بطاقة فاخرة.
   */
  premium: {
    radius:
      "rounded-2xl",

    border:
      "border-[#E0B85C]/25",

    background:
      "bg-[#4A1525]",

    text:
      "text-white",

    accent:
      "text-[#E0B85C]",
  },

  /**
   * الإطار الذهبي.
   */
  frame: {
    color:
      BRAND_COLORS.gold,

    opacity:
      BRAND_OPACITY.goldBorder,

    className:
      "border border-[#E0B85C]/20",
  },

  /**
   * الظل الرئيسي.
   */
  shadow:
    "shadow-[0_18px_55px_-30px_rgba(74,21,37,0.55)]",
} as const;

/**
 * =========================================================
 * الحقيبة / أيقونة التسوق
 * =========================================================
 *
 * تستخدم كعنصر من عناصر اللغة البصرية للمتجر.
 */

export const BRAND_BAG_ICON = {
  name:
    "shopping-bag",

  primary:
    BRAND_COLORS.burgundy,

  accent:
    BRAND_COLORS.gold,

  strokeWidth:
    1.9,

  sizes: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

/**
 * =========================================================
 * اللغة البصرية العامة
 * =========================================================
 */

export const BRAND_VISUAL_LANGUAGE = {
  primary:
    "burgundy-gold",

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

  direction:
    "rtl",

  mood:
    "premium-yemeni-modern",

  density:
    "clean",

  emphasis:
    "burgundy-with-gold-accent",
} as const;

/**
 * =========================================================
 * Responsive Design Tokens
 * =========================================================
 *
 * تساعد المكونات على الحفاظ على نفس النسب في جميع
 * أحجام الشاشات.
 */

export const BRAND_RESPONSIVE = {
  container:
    "mx-auto w-full max-w-6xl px-4 sm:px-5 lg:px-6",

  pagePadding:
    "px-4 sm:px-5 lg:px-6",

  sectionSpacing:
    "py-5 sm:py-7 lg:py-9",

  cardGap:
    "gap-3 sm:gap-4",

  radius:
    "rounded-2xl",

  mobileRadius:
    "rounded-xl",
} as const;

/**
 * =========================================================
 * إعدادات الحركة
 * =========================================================
 *
 * الحركة يجب أن تكون ناعمة وغير مزعجة.
 */

export const BRAND_MOTION = {
  fast:
    "duration-150",

  normal:
    "duration-200",

  smooth:
    "duration-300",

  premium:
    "duration-500",

  easing:
    "ease-out",

  standard:
    "transition-all duration-200 ease-out",
} as const;

/**
 * =========================================================
 * إعدادات الوصولية
 * =========================================================
 */

export const BRAND_ACCESSIBILITY = {
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0B85C]/50",

  focusRingStrong:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0B85C]",

  minimumTouchTarget:
    "min-h-10 min-w-10",

  noSelectImage:
    "select-none [-webkit-user-drag:none]",
} as const;

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

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

/**
 * إرجاع لون من ألوان الهوية.
 */
export function getBrandColor(
  color: keyof typeof BRAND_COLORS,
): string {
  return BRAND_COLORS[color];
}

/**
 * إرجاع إعدادات الخلفية.
 */
export function getBrandBackgroundConfig() {
  return BRAND_BACKGROUND_CONFIG;
}

/**
 * إرجاع إعدادات الحقيبة.
 */
export function getBrandBagIconConfig() {
  return BRAND_BAG_ICON;
}

/**
 * إرجاع إعدادات الهوية الكاملة.
 */
export function getBrandDesignTokens() {
  return {
    colors:
      BRAND_COLORS,

    darkColors:
      BRAND_DARK_COLORS,

    opacity:
      BRAND_OPACITY,

    ornaments:
      BRAND_ORNAMENTS,

    background:
      BRAND_BACKGROUND_CONFIG,

    surfaces:
      BRAND_SURFACE_CONFIG,

    bagIcon:
      BRAND_BAG_ICON,

    responsive:
      BRAND_RESPONSIVE,

    motion:
      BRAND_MOTION,

    accessibility:
      BRAND_ACCESSIBILITY,
  } as const;
}

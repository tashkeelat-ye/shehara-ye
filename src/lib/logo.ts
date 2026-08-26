/**
 * =========================================================
 * شهارة | SHEHARA
 * الهوية التجارية الرسمية
 * =========================================================
 *
 * الاسم التجاري:
 * شهارة
 *
 * الاسم اللاتيني:
 * SHEHARA
 *
 * الشعار:
 * تسوق بلا حدود
 *
 * =========================================================
 */

export const LOGO_URL = "/logo.png";

export const BRAND_NAME = "شهارة";

export const BRAND_FULL_NAME = "شهارة | SHEHARA";

export const BRAND_LATIN_NAME = "SHEHARA";

export const STORE_TAGLINE = "تسوق بلا حدود";

export const STORE_SHORT_TAGLINE = "تسوق بلا حدود";

export const BRAND_DESCRIPTION =
  "شهارة | SHEHARA — متجر إلكتروني يمني للتسوق بسهولة وأمان، بتجربة حديثة تناسب المستخدم اليمني.";

export const LOGO_ALT =
  "شعار شهارة SHEHARA - تسوق بلا حدود";

/**
 * =========================================================
 * الألوان الرسمية
 * =========================================================
 *
 * تم اعتمادها من الهوية البصرية المرفقة.
 *
 * الأزرق:
 * #05465F
 *
 * البرتقالي:
 * #CD562B
 */

export const BRAND_COLORS = {
  blue:
    "#05465F",

  blueDeep:
    "#033B50",

  blueDark:
    "#022F40",

  blueSoft:
    "#0B5B78",

  blueLight:
    "#DDEBF0",

  orange:
    "#CD562B",

  orangeDeep:
    "#A94320",

  orangeSoft:
    "#E9825C",

  orangeLight:
    "#F6D8CC",

  white:
    "#FFFFFF",

  cream:
    "#FAFCFD",

  paper:
    "#F3F7F9",

  paperDeep:
    "#E5EEF2",

  black:
    "#071B24",
} as const;

/**
 * =========================================================
 * ألوان الوضع الداكن
 * =========================================================
 */

export const BRAND_DARK_COLORS = {
  background:
    "#071B24",

  surface:
    "#0B2632",

  surfaceElevated:
    "#103544",

  surfaceSoft:
    "#154252",

  text:
    "#F4FAFC",

  textMuted:
    "#B6C8CF",

  border:
    "#CD562B",

  borderSoft:
    "#245466",

  primary:
    "#CD562B",

  primaryDeep:
    "#A94320",

  blue:
    "#0B5B78",

  blueDeep:
    "#05465F",
} as const;

/**
 * =========================================================
 * إعدادات الشعار
 * =========================================================
 */

export const BRAND_LOGO_CONFIG = {
  src:
    LOGO_URL,

  alt:
    LOGO_ALT,

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
    BRAND_COLORS.blue,

  borderColor:
    BRAND_COLORS.orange,
} as const;

/**
 * =========================================================
 * الشفافية
 * =========================================================
 */

export const BRAND_OPACITY = {
  orangeBorder:
    0.18,

  blueBorder:
    0.16,

  ornament:
    0.06,

  watermark:
    0.035,

  architecture:
    0.025,

  orangeSurface:
    0.06,

  blueSurface:
    0.045,

  detail:
    0.2,
} as const;

/**
 * =========================================================
 * اللغة البصرية
 * =========================================================
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
    "thin-orange-frame",

  arches:
    "yemeni-architectural-arches",
} as const;

export const BRAND_BACKGROUND_CONFIG = {
  light:
    BRAND_COLORS.cream,

  dark:
    BRAND_DARK_COLORS.background,

  watermarkColor:
    BRAND_COLORS.blue,

  accentColor:
    BRAND_COLORS.orange,

  watermarkOpacity:
    BRAND_OPACITY.watermark,

  architectureOpacity:
    BRAND_OPACITY.architecture,

  ornamentOpacity:
    BRAND_OPACITY.ornament,

  watermarkPosition:
    "background-center",

  ornamentSize:
    "large",
} as const;

/**
 * =========================================================
 * الأسطح
 * =========================================================
 */

export const BRAND_SURFACE_CONFIG = {
  card: {
    radius:
      "rounded-2xl",

    border:
      "border-[#05465F]/12",

    background:
      "bg-white/90",

    darkBackground:
      "dark:bg-white/[0.035]",
  },

  premium: {
    radius:
      "rounded-2xl",

    border:
      "border-[#CD562B]/25",

    background:
      "bg-[#05465F]",

    text:
      "text-white",

    accent:
      "text-[#CD562B]",
  },

  frame: {
    color:
      BRAND_COLORS.orange,

    opacity:
      BRAND_OPACITY.orangeBorder,

    className:
      "border border-[#CD562B]/20",
  },

  shadow:
    "shadow-[0_18px_55px_-30px_rgba(5,70,95,0.45)]",
} as const;

/**
 * =========================================================
 * أيقونة التسوق
 * =========================================================
 */

export const BRAND_BAG_ICON = {
  name:
    "shopping-bag",

  primary:
    BRAND_COLORS.blue,

  accent:
    BRAND_COLORS.orange,

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
    "blue-orange",

  background:
    "yemeni-heritage-watermark",

  architecture:
    "yemeni-architecture",

  ornament:
    "yemeni-geometric-ornament",

  icon:
    "shopping-bag",

  surface:
    "clean-white",

  frame:
    "thin-orange-frame",

  direction:
    "rtl",

  mood:
    "modern-yemeni-premium",

  density:
    "clean",

  emphasis:
    "blue-with-orange-accent",
} as const;

/**
 * =========================================================
 * Responsive Design Tokens
 * =========================================================
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
 * الحركة
 * =========================================================
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
 * Accessibility
 * =========================================================
 */

export const BRAND_ACCESSIBILITY = {
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CD562B]/50",

  focusRingStrong:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CD562B]",

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

export function getLogoUrl(): string {
  return LOGO_URL;
}

export function getBrandName(): string {
  return BRAND_FULL_NAME;
}

export function getStoreTagline(): string {
  return STORE_TAGLINE;
}

export function getBrandColor(
  color: keyof typeof BRAND_COLORS,
): string {
  return BRAND_COLORS[color];
}

export function getBrandBackgroundConfig() {
  return BRAND_BACKGROUND_CONFIG;
}

export function getBrandBagIconConfig() {
  return BRAND_BAG_ICON;
}

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

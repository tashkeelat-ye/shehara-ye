/**
 * =========================================================
 * SHEHARA | شهارة
 * الهوية التجارية الرسمية
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
 */

export const BRAND_COLORS = {
  blue: "#0E4D64",
  blueDeep: "#0A3D50",
  blueDark: "#082F3D",
  blueSoft: "#17647E",
  blueLight: "#E4F0F4",

  orange: "#D65A31",
  orangeDeep: "#B74624",
  orangeSoft: "#E98261",
  orangeLight: "#F8DED5",

  white: "#FFFFFF",
  cream: "#FAF9F6",
  paper: "#F4F7F8",
  paperDeep: "#E4ECEF",

  black: "#081D27",
} as const;

/**
 * Aliases للتوافق مع المكونات القديمة.
 * لا تحذفها.
 */
export const BRAND_DARK_COLORS = {
  background: "#071B24",
  surface: "#0B2936",
  surfaceElevated: "#103847",
  surfaceSoft: "#164657",

  text: "#F5FAFC",
  textMuted: "#B8C9CF",

  border: "#D65A31",
  borderSoft: "#285667",

  primary: "#D65A31",
  primaryDeep: "#B74624",

  blue: "#17647E",
  blueDeep: "#0E4D64",
} as const;

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

  radiusClass: "rounded-xl",

  backgroundColor: BRAND_COLORS.blue,
  borderColor: BRAND_COLORS.orange,
} as const;

export const BRAND_OPACITY = {
  orangeBorder: 0.2,
  blueBorder: 0.16,
  ornament: 0.055,
  watermark: 0.035,
  architecture: 0.025,
  orangeSurface: 0.06,
  blueSurface: 0.045,
  detail: 0.2,
} as const;

export const BRAND_ORNAMENTS = {
  geometric: "yemeni-geometric-ornament",
  heritage: "yemeni-heritage-pattern",
  architecture: "yemeni-architecture",
  diamond: "heritage-diamond",
  frame: "thin-orange-frame",
  arches: "yemeni-architectural-arches",
} as const;

export const BRAND_BACKGROUND_CONFIG = {
  light: BRAND_COLORS.cream,
  dark: BRAND_DARK_COLORS.background,
  watermarkColor: BRAND_COLORS.blue,
  accentColor: BRAND_COLORS.orange,
  watermarkOpacity: BRAND_OPACITY.watermark,
  architectureOpacity: BRAND_OPACITY.architecture,
  ornamentOpacity: BRAND_OPACITY.ornament,
  watermarkPosition: "background-center",
  ornamentSize: "large",
} as const;

export const BRAND_SURFACE_CONFIG = {
  card: {
    radius: "rounded-2xl",
    border: "border-[#0E4D64]/12",
    background: "bg-white/95",
    darkBackground: "dark:bg-white/[0.035]",
  },

  premium: {
    radius: "rounded-2xl",
    border: "border-[#D65A31]/25",
    background: "bg-[#0E4D64]",
    text: "text-white",
    accent: "text-[#D65A31]",
  },

  frame: {
    color: BRAND_COLORS.orange,
    opacity: BRAND_OPACITY.orangeBorder,
    className: "border border-[#D65A31]/20",
  },

  shadow:
    "shadow-[0_18px_55px_-30px_rgba(14,77,100,0.45)]",
} as const;

export const BRAND_BAG_ICON = {
  name: "shopping-bag",

  primary: BRAND_COLORS.blue,
  accent: BRAND_COLORS.orange,

  strokeWidth: 1.9,

  sizes: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

export const BRAND_VISUAL_LANGUAGE = {
  primary: "blue-orange",
  background: "yemeni-heritage-watermark",
  architecture: "yemeni-architecture",
  ornament: "yemeni-geometric-ornament",
  icon: "shopping-bag",
  surface: "clean-white",
  frame: "thin-orange-frame",
  direction: "rtl",
  mood: "modern-yemeni-premium",
  density: "clean",
  emphasis: "blue-with-orange-accent",
} as const;

export const BRAND_RESPONSIVE = {
  container:
    "mx-auto w-full max-w-6xl px-4 sm:px-5 lg:px-6",

  pagePadding: "px-4 sm:px-5 lg:px-6",

  sectionSpacing: "py-5 sm:py-7 lg:py-9",

  cardGap: "gap-3 sm:gap-4",

  radius: "rounded-2xl",

  mobileRadius: "rounded-xl",
} as const;

export const BRAND_MOTION = {
  fast: "duration-150",
  normal: "duration-200",
  smooth: "duration-300",
  premium: "duration-500",

  easing: "ease-out",

  standard:
    "transition-all duration-200 ease-out",
} as const;

export const BRAND_ACCESSIBILITY = {
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/50",

  focusRingStrong:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]",

  minimumTouchTarget:
    "min-h-10 min-w-10",

  noSelectImage:
    "select-none [-webkit-user-drag:none]",
} as const;

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
    colors: BRAND_COLORS,
    darkColors: BRAND_DARK_COLORS,
    opacity: BRAND_OPACITY,
    ornaments: BRAND_ORNAMENTS,
    background: BRAND_BACKGROUND_CONFIG,
    surfaces: BRAND_SURFACE_CONFIG,
    bagIcon: BRAND_BAG_ICON,
    responsive: BRAND_RESPONSIVE,
    motion: BRAND_MOTION,
    accessibility: BRAND_ACCESSIBILITY,
  } as const;
}

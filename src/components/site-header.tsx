import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  Search,
  ShoppingCart,
  Sun,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { SideMenu } from "@/components/side-menu";
import { useCart } from "@/lib/cart-context";

export function SiteHeader() {
  const navigate = useNavigate();

  const {
    count,
    setDrawerOpen,
  } = useCart();

  const [darkMode, setDarkMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  /**
   * =========================================================
   * استعادة الوضع المحفوظ
   * =========================================================
   */

  useEffect(() => {
    try {
      const savedTheme =
        localStorage.getItem("tashkilat-theme");

      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        setDarkMode(true);
        return;
      }

      if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
        setDarkMode(false);
        return;
      }
    } catch {
      // تجاهل أخطاء localStorage
    }

    setDarkMode(
      document.documentElement.classList.contains(
        "dark",
      ),
    );
  }, []);

  /**
   * =========================================================
   * الوضع الداكن
   * =========================================================
   */

  const toggleDarkMode = () => {
    const nextMode = !darkMode;

    document.documentElement.classList.toggle(
      "dark",
      nextMode,
    );

    setDarkMode(nextMode);

    try {
      localStorage.setItem(
        "tashkilat-theme",
        nextMode ? "dark" : "light",
      );
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  };

  /**
   * =========================================================
   * البحث الفعلي
   * =========================================================
   *
   * صفحة /products تستخدم q فعلياً.
   */

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      void navigate({
        to: "/products",
      });

      return;
    }

    void navigate({
      to: "/products",
      search: {
        q: query,
      },
    });
  };

  /**
   * =========================================================
   * فتح السلة الحقيقية
   * =========================================================
   *
   * السلة في المشروع تعمل من خلال CartProvider
   * و drawerOpen / setDrawerOpen.
   *
   * لذلك لا نستخدم /cart حتى لا يحدث 404.
   */

  const handleOpenCart = () => {
    setDrawerOpen(true);
  };

  /**
   * =========================================================
   * الإشعارات
   * =========================================================
   *
   * لا يوجد حالياً Route مؤكد باسم /notifications
   * في التطبيق.
   *
   * لذلك لا نقوم بأي navigation إلى مسار غير موجود.
   *
   * سيتم ربط الزر لاحقاً بنظام الإشعارات الحقيقي
   * عند إضافة مصدر الإشعارات الفعلي.
   */

  const handleNotifications = () => {
    // لا يوجد Route للإشعارات حالياً.
    // إبقاء الزر بدون navigation يمنع خطأ 404.
  };

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-[color:var(--brand-gold)]/20
        bg-[color:var(--background)]/95
        backdrop-blur-md
        supports-[backdrop-filter]:bg-[color:var(--background)]/80
      "
    >
      {/* =====================================================
          القائمة العلوية
          ===================================================== */}

      <div
        className="
          mx-auto
          flex
          h-16
          w-full
          max-w-7xl
          items-center
          gap-2
          px-3
          sm:px-5
          lg:px-8
        "
      >
        {/* القائمة الجانبية الحالية */}

        <div className="shrink-0">
          <SideMenu />
        </div>

        {/* الشعار */}

        <Link
          to="/"
          aria-label="تشكيلات للتسوق"
          className="
            flex
            min-w-0
            shrink-0
            items-center
            gap-2
          "
        >
          <span
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[color:var(--brand-burgundy)]
              text-[color:var(--brand-gold)]
              shadow-sm
            "
          >
            <span
              className="
                text-lg
                font-extrabold
                leading-none
              "
            >
              ت
            </span>
          </span>

          <span
            className="
              hidden
              leading-none
              sm:block
            "
          >
            <span
              className="
                block
                text-base
                font-bold
                text-[color:var(--brand-burgundy)]
                dark:text-[color:var(--brand-gold)]
              "
            >
              تشكيلات
            </span>

            <span
              className="
                mt-1
                block
                text-[10px]
                font-medium
                text-[color:var(--brand-gold-deep)]
              "
            >
              للتسوق
            </span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* ===================================================
            أدوات القائمة العلوية
            =================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-1
          "
        >
          {/* الوضع الداكن */}

          <button
            type="button"
            aria-label={
              darkMode
                ? "تفعيل الوضع الفاتح"
                : "تفعيل الوضع الداكن"
            }
            title={
              darkMode
                ? "الوضع الفاتح"
                : "الوضع الداكن"
            }
            onClick={toggleDarkMode}
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
            "
          >
            {darkMode ? (
              <Sun
                size={20}
                strokeWidth={2}
              />
            ) : (
              <Moon
                size={20}
                strokeWidth={2}
              />
            )}
          </button>

          {/* الإشعارات */}

          <button
            type="button"
            aria-label="الإشعارات"
            title="الإشعارات"
            onClick={handleNotifications}
            className="
              relative
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
            "
          >
            <Bell
              size={20}
              strokeWidth={2}
            />
          </button>

          {/* السلة */}

          <button
            type="button"
            aria-label="السلة"
            title="السلة"
            onClick={handleOpenCart}
            className="
              relative
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
            "
          >
            <ShoppingCart
              size={20}
              strokeWidth={2}
            />

            {/* العدد الحقيقي للسلة */}

            {count > 0 ? (
              <span
                aria-label={`${count} منتج في السلة`}
                className="
                  absolute
                  -end-1
                  -top-1
                  flex
                  min-h-4
                  min-w-4
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-[color:var(--background)]
                  bg-[color:var(--brand-burgundy)]
                  px-1
                  text-[8px]
                  font-extrabold
                  leading-none
                  text-[color:var(--brand-gold)]
                "
              >
                {count > 99
                  ? "99+"
                  : count.toLocaleString("ar-EG")}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* =====================================================
          نافذة البحث
          ===================================================== */}

      <div
        className="
          border-t
          border-[color:var(--brand-gold)]/10
          bg-[color:var(--background)]
          px-3
          py-3
          sm:px-5
          lg:px-8
        "
      >
        <form
          onSubmit={handleSearch}
          role="search"
          className="
            mx-auto
            w-full
            max-w-7xl
          "
        >
          <div className="relative">
            <Search
              size={19}
              strokeWidth={2}
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                start-3
                top-1/2
                -translate-y-1/2
                text-[color:var(--muted-foreground)]
              "
            />

            <input
              value={searchValue}
              onChange={(event) =>
                setSearchValue(event.target.value)
              }
              type="search"
              placeholder="ابحث عن المنتجات..."
              aria-label="البحث عن المنتجات"
              autoComplete="off"
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[color:var(--border)]
                bg-[color:var(--card)]
                pe-4
                ps-10
                text-sm
                text-[color:var(--foreground)]
                outline-none
                transition
                placeholder:text-[color:var(--muted-foreground)]
                focus:border-[color:var(--brand-gold-deep)]
                focus:ring-2
                focus:ring-[color:var(--brand-gold)]/20
              "
            />
          </div>
        </form>
      </div>
    </header>
  );
}

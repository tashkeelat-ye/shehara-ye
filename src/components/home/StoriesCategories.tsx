import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  supabase,
} from "@/integrations/supabase/client";


/**
 * =========================================================
 * شهارة للتسوق
 * نظام القصص Stories
 * =========================================================
 *
 * هذا المكون مسؤول عن:
 *
 * 1. تحميل القصص النشطة من Supabase.
 * 2. عرض شريط القصص أعلى الصفحة الرئيسية.
 * 3. فتح القصة في عارض Full Screen.
 * 4. التنقل التلقائي واليدوي بين القصص.
 * 5. احترام تاريخ بداية وانتهاء القصة.
 *
 * =========================================================
 */


type Story = {
  id: string;

  title: string;

  image_url: string;

  link_url: string | null;

  sort_order: number;

  is_active: boolean;

  starts_at: string | null;

  expires_at: string | null;

  created_at: string;
};


/**
 * مدة عرض كل قصة بالمللي ثانية.
 */
const STORY_DURATION =
  5000;


/**
 * =========================================================
 * جلب القصص
 * =========================================================
 */
async function fetchStories(): Promise<Story[]> {
  /**
   * ملاحظة:
   *
   * ملف Supabase types.ts الموجود في المشروع تم توليده
   * قبل إنشاء جدول stories، لذلك نستخدم cast محلياً هنا
   * حتى لا نضطر لتعديل الملف المولد يدوياً.
   *
   * عند إعادة توليد Types من Supabase مستقبلاً يمكن
   * إزالة هذا الـ cast.
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storiesTable = (supabase as any).from(
    "stories",
  );


  const now =
    new Date().toISOString();


  const {
    data,
    error,
  } = await storiesTable
    .select(
      [
        "id",
        "title",
        "image_url",
        "link_url",
        "sort_order",
        "is_active",
        "starts_at",
        "expires_at",
        "created_at",
      ].join(","),
    )
    .eq(
      "is_active",
      true,
    )
    .or(
      `starts_at.is.null,starts_at.lte.${now}`,
    )
    .or(
      `expires_at.is.null,expires_at.gt.${now}`,
    )
    .order(
      "sort_order",
      {
        ascending: true,
      },
    )
    .order(
      "created_at",
      {
        ascending: false,
      });


  if (error) {
    throw error;
  }


  return (
    (data as Story[] | null) ??
    []
  );
}


/**
 * =========================================================
 * المكون الرئيسي
 * =========================================================
 */
export function StoriesCategories() {
  const [
    stories,
    setStories,
  ] =
    useState<Story[]>(
      [],
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    selectedStory,
    setSelectedStory,
  ] =
    useState<number | null>(
      null,
    );


  const [
    progress,
    setProgress,
  ] =
    useState(0);


  /**
   * =======================================================
   * تحميل القصص
   * =======================================================
   */
  useEffect(() => {
    let mounted =
      true;


    async function loadStories() {
      try {
        const result =
          await fetchStories();


        if (
          mounted
        ) {
          setStories(
            result,
          );
        }
      } catch (
        error
      ) {
        console.warn(
          "[Stories] تعذر تحميل القصص:",
          error,
        );


        if (
          mounted
        ) {
          setStories(
            [],
          );
        }
      } finally {
        if (
          mounted
        ) {
          setLoading(
            false,
          );
        }
      }
    }


    void loadStories();


    return () => {
      mounted =
        false;
    };
  }, []);


  /**
   * =======================================================
   * القصة الحالية
   * =======================================================
   */
  const currentStory =
    useMemo(
      () => {
        if (
          selectedStory ===
            null ||
          !stories[
            selectedStory
          ]
        ) {
          return null;
        }


        return stories[
          selectedStory
        ];
      },
      [
        selectedStory,
        stories,
      ],
    );


  /**
   * =======================================================
   * إغلاق العارض
   * =======================================================
   */
  const closeViewer =
    () => {
      setSelectedStory(
        null,
      );

      setProgress(
        0,
      );
    };


  /**
   * =======================================================
   * فتح قصة
   * =======================================================
   */
  const openStory =
    (
      index: number,
    ) => {
      setSelectedStory(
        index,
      );

      setProgress(
        0,
      );
    };


  /**
   * =======================================================
   * القصة التالية
   * =======================================================
   */
  const nextStory =
    () => {
      if (
        selectedStory ===
          null
      ) {
        return;
      }


      if (
        selectedStory <
        stories.length - 1
      ) {
        setSelectedStory(
          selectedStory + 1,
        );

        setProgress(
          0,
        );

        return;
      }


      closeViewer();
    };


  /**
   * =======================================================
   * القصة السابقة
   * =======================================================
   */
  const previousStory =
    () => {
      if (
        selectedStory ===
          null
      ) {
        return;
      }


      if (
        selectedStory >
        0
      ) {
        setSelectedStory(
          selectedStory - 1,
        );

        setProgress(
          0,
        );
      } else {
        setProgress(
          0,
        );
      }
    };


  /**
   * =======================================================
   * التحكم بالـ Keyboard
   * =======================================================
   */
  useEffect(() => {
    if (
      selectedStory ===
      null
    ) {
      return;
    }


    const handleKeyDown =
      (
        event: KeyboardEvent,
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeViewer();

          return;
        }


        if (
          event.key ===
          "ArrowLeft"
        ) {
          nextStory();

          return;
        }


        if (
          event.key ===
          "ArrowRight"
        ) {
          previousStory();
        }
      };


    window.addEventListener(
      "keydown",
      handleKeyDown,
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    selectedStory,
    stories.length,
  ]);


  /**
   * =======================================================
   * منع تمرير الصفحة أثناء فتح القصة
   * =======================================================
   */
  useEffect(() => {
    if (
      selectedStory ===
      null
    ) {
      return;
    }


    const previousOverflow =
      document.body.style
        .overflow;


    document.body.style.overflow =
      "hidden";


    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    selectedStory,
  ]);


  /**
   * =======================================================
   * التقدم التلقائي
   * =======================================================
   */
  useEffect(() => {
    if (
      selectedStory ===
        null ||
      !currentStory
    ) {
      return;
    }


    setProgress(
      0,
    );


    const startedAt =
      Date.now();


    const interval =
      window.setInterval(
        () => {
          const elapsed =
            Date.now() -
            startedAt;


          const percentage =
            Math.min(
              100,
              (
                elapsed /
                STORY_DURATION
              ) *
                100,
            );


          setProgress(
            percentage,
          );


          if (
            percentage >=
            100
          ) {
            clearInterval(
              interval,
            );


            if (
              selectedStory <
              stories.length - 1
            ) {
              setSelectedStory(
                selectedStory + 1,
              );

              setProgress(
                0,
              );
            } else {
              closeViewer();
            }
          }
        },
        50,
      );


    return () => {
      clearInterval(
        interval,
      );
    };
  }, [
    selectedStory,
    currentStory,
    stories.length,
  ]);


  /**
   * =======================================================
   * حالة التحميل
   * =======================================================
   */
  if (
    loading
  ) {
    return (
      <section
        dir="rtl"
        className="
          border-b
          border-[#0E4D64]/5
          bg-background
          py-4
        "
      >
        <div
          className="
            no-scrollbar
            flex
            gap-4
            overflow-x-auto
            px-4
          "
        >
          {Array.from({
            length: 6,
          }).map(
            (
              _,
              index,
            ) => (
              <div
                key={index}
                className="
                  flex
                  shrink-0
                  flex-col
                  items-center
                  gap-2
                "
              >
                <Skeleton
                  className="
                    h-[68px]
                    w-[68px]
                    rounded-full
                  "
                />

                <Skeleton
                  className="
                    h-3
                    w-12
                  "
                />
              </div>
            ),
          )}
        </div>
      </section>
    );
  }


  /**
   * =======================================================
   * لا توجد قصص
   * =======================================================
   */
  if (
    stories.length ===
    0
  ) {
    return null;
  }


  return (
    <>
      {/* ===================================================
          شريط القصص
          =================================================== */}

      <section
        dir="rtl"
        aria-label="قصص شهارة"
        className="
          border-b
          border-[#0E4D64]/5
          bg-background
          py-3
        "
      >
        <div
          className="
            no-scrollbar
            flex
            gap-4
            overflow-x-auto
            px-4
            pb-1
          "
        >
          {stories.map(
            (
              story,
              index,
            ) => (
              <button
                key={
                  story.id
                }
                type="button"
                onClick={() =>
                  openStory(
                    index,
                  )
                }
                className="
                  group
                  flex
                  w-[72px]
                  shrink-0
                  flex-col
                  items-center
                  gap-1.5
                  outline-none
                "
                aria-label={`فتح قصة ${story.title || "شهارة"}`}
              >
                {/* =========================================
                    الحلقة الخارجية
                    ========================================= */}

                <span
                  className="
                    relative
                    block
                    h-[68px]
                    w-[68px]
                    rounded-full
                    bg-gradient-to-tr
                    from-[#0E4D64]
                    via-[#B74624]
                    to-[#E7C66A]
                    p-[2.5px]
                    shadow-[0_3px_12px_rgba(74,21,37,0.12)]
                    transition-transform
                    duration-200
                    group-active:scale-90
                    group-hover:scale-105
                  "
                >
                  {/* =======================================
                      الإطار الداخلي
                      ======================================= */}

                  <span
                    className="
                      block
                      h-full
                      w-full
                      rounded-full
                      bg-background
                      p-[2px]
                    "
                  >
                    <img
                      src={
                        story.image_url
                      }
                      alt={
                        story.title ||
                        "قصة من شهارة"
                      }
                      loading={
                        index <
                        4
                          ? "eager"
                          : "lazy"
                      }
                      className="
                        h-full
                        w-full
                        rounded-full
                        object-cover
                      "
                      onError={(
                        event,
                      ) => {
                        event.currentTarget.style.visibility =
                          "hidden";
                      }}
                    />
                  </span>


                  {/* =====================================
                      النقطة الذهبية
                      ===================================== */}

                  <span
                    className="
                      absolute
                      bottom-0
                      left-1/2
                      h-2
                      w-2
                      -translate-x-1/2
                      rounded-full
                      border
                      border-background
                      bg-[#D65A31]
                    "
                    aria-hidden="true"
                  />
                </span>


                {/* =========================================
                    اسم القصة
                    ========================================= */}

                <span
                  className="
                    w-full
                    truncate
                    px-0.5
                    text-center
                    text-[11px]
                    font-semibold
                    leading-4
                    text-[#0E4D64]
                  "
                >
                  {story.title ||
                    "شهارة"}
                </span>
              </button>
            ),
          )}
        </div>
      </section>


      {/* ===================================================
          عارض القصص
          =================================================== */}

      {currentStory && (
        <div
          dir="rtl"
          className="
            fixed
            inset-0
            z-[20000]
            flex
            items-center
            justify-center
            bg-black/95
            px-2
            py-4
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            currentStory.title ||
            "قصة شهارة"
          }
          onClick={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeViewer();
            }
          }}
        >
          {/* ===============================================
              الحاوية الرئيسية
              =============================================== */}

          <div
            className="
              relative
              h-full
              w-full
              max-w-[480px]
              overflow-hidden
              rounded-2xl
              bg-[#16070D]
              shadow-2xl
            "
          >
            {/* =============================================
                شريط التقدم
                ============================================= */}

            <div
              className="
                absolute
                inset-x-3
                top-3
                z-30
                flex
                gap-1
              "
              dir="ltr"
            >
              {stories.map(
                (
                  story,
                  index,
                ) => {
                  const width =
                    index <
                    (selectedStory ??
                      0)
                      ? 100
                      : index ===
                          selectedStory
                        ? progress
                        : 0;


                  return (
                    <div
                      key={
                        story.id
                      }
                      className="
                        h-1
                        flex-1
                        overflow-hidden
                        rounded-full
                        bg-white/30
                      "
                    >
                      <div
                        className="
                          h-full
                          rounded-full
                          bg-white
                          transition-[width]
                          duration-75
                        "
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  );
                },
              )}
            </div>


            {/* =============================================
                زر الإغلاق
                ============================================= */}

            <button
              type="button"
              onClick={
                closeViewer
              }
              className="
                absolute
                right-3
                top-8
                z-40
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-black/40
                text-white
                backdrop-blur-md
                transition
                hover:bg-black/60
                active:scale-90
              "
              aria-label="إغلاق القصة"
            >
              <X
                className="h-5 w-5"
              />
            </button>


            {/* =============================================
                عنوان القصة
                ============================================= */}

            <div
              className="
                absolute
                left-4
                right-16
                top-7
                z-30
                pointer-events-none
              "
            >
              <p
                className="
                  truncate
                  text-right
                  text-sm
                  font-bold
                  text-white
                  drop-shadow-md
                "
              >
                {currentStory.title ||
                  "شهارة للتسوق"}
              </p>
            </div>


            {/* =============================================
                الصورة
                ============================================= */}

            <img
              src={
                currentStory.image_url
              }
              alt={
                currentStory.title ||
                "قصة شهارة"
              }
              className="
                absolute
                inset-0
                h-full
                w-full
                object-cover
                select-none
              "
              draggable={false}
            />


            {/* =============================================
                طبقة تدرج أسفل الصورة
                ============================================= */}

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                z-10
                h-40
                bg-gradient-to-t
                from-black/80
                via-black/25
                to-transparent
              "
            />


            {/* =============================================
                زر السابق
                ============================================= */}

            <button
              type="button"
              onClick={
                previousStory
              }
              className="
                absolute
                right-1
                top-1/2
                z-30
                -translate-y-1/2
                flex
                h-14
                w-12
                items-center
                justify-center
                rounded-l-2xl
                bg-black/15
                text-white
                transition
                hover:bg-black/30
                active:scale-95
              "
              aria-label="القصة السابقة"
            >
              <ChevronRight
                className="
                  h-7
                  w-7
                  drop-shadow
                "
              />
            </button>


            {/* =============================================
                زر التالي
                ============================================= */}

            <button
              type="button"
              onClick={
                nextStory
              }
              className="
                absolute
                left-1
                top-1/2
                z-30
                -translate-y-1/2
                flex
                h-14
                w-12
                items-center
                justify-center
                rounded-r-2xl
                bg-black/15
                text-white
                transition
                hover:bg-black/30
                active:scale-95
              "
              aria-label="القصة التالية"
            >
              <ChevronLeft
                className="
                  h-7
                  w-7
                  drop-shadow
                "
              />
            </button>


            {/* =============================================
                معلومات القصة + الرابط
                ============================================= */}

            {currentStory.link_url && (
              <div
                className="
                  absolute
                  inset-x-0
                  bottom-5
                  z-30
                  flex
                  justify-center
                  px-5
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    if (
                      currentStory.link_url
                    ) {
                      window.location.assign(
                        currentStory.link_url,
                      );
                    }
                  }}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#D65A31]/60
                    bg-[#0E4D64]/95
                    px-6
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    backdrop-blur-md
                    transition
                    hover:bg-[#5A1A2D]
                    active:scale-95
                  "
                >
                  <span>
                    اكتشف المزيد
                  </span>

                  <ExternalLink
                    className="
                      h-4
                      w-4
                      text-[#D65A31]
                    "
                  />
                </button>
              </div>
            )}


            {/* =============================================
                منطقة لمس يسار/يمين
                ============================================= */}

            <button
              type="button"
              aria-label="التالي"
              onClick={
                nextStory
              }
              className="
                absolute
                inset-y-20
                left-0
                z-20
                w-1/3
                cursor-pointer
                opacity-0
              "
            />

            <button
              type="button"
              aria-label="السابق"
              onClick={
                previousStory
              }
              className="
                absolute
                inset-y-20
                right-0
                z-20
                w-1/3
                cursor-pointer
                opacity-0
              "
            />
          </div>
        </div>
      )}
    </>
  );
}

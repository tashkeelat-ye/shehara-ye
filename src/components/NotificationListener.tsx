import { useEffect, useRef } from "react";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type NotificationListenerProps = {
  currentUserId?: string;
};

type IncomingNotification = {
  id?: string;
  user_id?: string | null;
  title?: string | null;
  body?: string | null;
  kind?: string | null;
  link_url?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

const NOTIFICATION_SOUND =
  "/notification.mp3";

const PROCESSED_STORAGE_PREFIX =
  "shehara_processed_notifications";

const MAX_PROCESSED_IDS = 100;

function createNotificationAudio(): HTMLAudioElement {
  const audio = new Audio(
    NOTIFICATION_SOUND,
  );

  audio.preload = "auto";
  audio.volume = 1;
  audio.setAttribute(
    "playsinline",
    "true",
  );

  return audio;
}

function getProcessedStorageKey(
  userId: string,
) {
  return `${PROCESSED_STORAGE_PREFIX}:${userId}`;
}

function loadProcessedNotificationIds(
  userId: string,
): Set<string> {
  try {
    const raw =
      localStorage.getItem(
        getProcessedStorageKey(userId),
      );

    if (!raw) {
      return new Set();
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed.filter(
        (value): value is string =>
          typeof value === "string" &&
          value.length > 0,
      ),
    );
  } catch {
    return new Set();
  }
}

function saveProcessedNotificationIds(
  userId: string,
  ids: Set<string>,
) {
  try {
    const values =
      Array.from(ids).slice(
        -MAX_PROCESSED_IDS,
      );

    localStorage.setItem(
      getProcessedStorageKey(userId),
      JSON.stringify(values),
    );
  } catch {
    // تجاهل أخطاء التخزين المحلي.
  }
}

export function NotificationListener({
  currentUserId,
}: NotificationListenerProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const audioUnlockedRef =
    useRef(false);

  const disposedRef =
    useRef(false);

  const processedIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const pendingSoundCountRef =
    useRef(0);

  const soundRetryActiveRef =
    useRef(false);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    disposedRef.current =
      false;

    processedIdsRef.current =
      loadProcessedNotificationIds(
        currentUserId,
      );

    /*
     * ========================================================
     * Audio
     * ========================================================
     */

    const getAudio = () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      if (!audioRef.current) {
        audioRef.current =
          createNotificationAudio();
      }

      return audioRef.current;
    };

    const preloadAudio = () => {
      const audio = getAudio();

      if (!audio) {
        return;
      }

      try {
        audio.load();
      } catch {
        // تجاهل.
      }
    };

    /*
     * ========================================================
     * فتح صلاحية تشغيل الصوت بعد تفاعل المستخدم
     * ========================================================
     */

    const unlockAudio = () => {
      if (
        disposedRef.current ||
        audioUnlockedRef.current
      ) {
        return;
      }

      const audio = getAudio();

      if (!audio) {
        return;
      }

      try {
        audio.muted = true;
        audio.volume = 0;
        audio.currentTime = 0;

        const promise =
          audio.play();

        if (
          promise &&
          typeof promise.then ===
            "function"
        ) {
          void promise
            .then(() => {
              if (
                disposedRef.current
              ) {
                return;
              }

              audio.pause();

              try {
                audio.currentTime = 0;
              } catch {
                // تجاهل.
              }

              audio.muted = false;
              audio.volume = 1;

              audioUnlockedRef.current =
                true;

              /*
               * إذا كانت هناك أصوات معلقة
               * بسبب منع autoplay، نشغلها الآن.
               */
              if (
                pendingSoundCountRef.current >
                0
              ) {
                const count =
                  pendingSoundCountRef.current;

                pendingSoundCountRef.current =
                  0;

                void playPendingSounds(
                  count,
                );
              }
            })
            .catch(() => {
              // المتصفح منع autoplay.
            });
        }
      } catch {
        // المتصفح منع التشغيل.
      }
    };

    /*
     * ========================================================
     * تشغيل صوت واحد
     * ========================================================
     */

    const playNotificationSound =
      async (): Promise<boolean> => {
        if (
          disposedRef.current
        ) {
          return false;
        }

        const audio = getAudio();

        if (!audio) {
          return false;
        }

        try {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = 1;

          const promise =
            audio.play();

          if (promise) {
            await promise;
          }

          audioUnlockedRef.current =
            true;

          return true;
        } catch (error) {
          audioUnlockedRef.current =
            false;

          console.warn(
            "تعذر تشغيل صوت إشعار شهارة:",
            error,
          );

          return false;
        }
      };

    /*
     * ========================================================
     * تشغيل الأصوات المعلقة
     * ========================================================
     */

    async function playPendingSounds(
      count: number,
    ) {
      if (
        disposedRef.current ||
        count <= 0 ||
        soundRetryActiveRef.current
      ) {
        return;
      }

      soundRetryActiveRef.current =
        true;

      try {
        for (
          let index = 0;
          index < count;
          index += 1
        ) {
          if (
            disposedRef.current
          ) {
            break;
          }

          const success =
            await playNotificationSound();

          if (!success) {
            pendingSoundCountRef.current +=
              count - index;

            break;
          }

          /*
           * مسافة صغيرة بين الأصوات
           * إذا وصلت عدة إشعارات أثناء غياب المستخدم.
           */
          if (
            index <
            count - 1
          ) {
            await new Promise(
              (resolve) =>
                window.setTimeout(
                  resolve,
                  900,
                ),
            );
          }
        }
      } finally {
        soundRetryActiveRef.current =
          false;
      }
    }

    /*
     * ========================================================
     * تشغيل إشعار جديد
     * ========================================================
     */

    const playForNotification =
      async () => {
        const success =
          await playNotificationSound();

        if (success) {
          return;
        }

        /*
         * إذا منع المتصفح الصوت،
         * نحفظه حتى أول تفاعل من المستخدم.
         */
        pendingSoundCountRef.current +=
          1;

        toast(
          "لديك إشعار جديد 🔔",
          {
            description:
              "اضغط لتشغيل صوت التنبيه.",
            duration: 12000,

            icon: (
              <Volume2 className="h-4 w-4 text-primary" />
            ),

            action: {
              label:
                "تشغيل الصوت",
              onClick: () => {
                void playPendingSounds(
                  pendingSoundCountRef.current,
                );

                pendingSoundCountRef.current =
                  0;
              },
            },
          },
        );
      };

    /*
     * ========================================================
     * تعليم إشعار بأنه تم عرضه محلياً
     * ========================================================
     */

    const markProcessed =
      (
        notificationId: string,
      ) => {
        processedIdsRef.current.add(
          notificationId,
        );

        /*
         * منع نمو localStorage بلا حدود.
         */
        if (
          processedIdsRef.current
            .size >
          MAX_PROCESSED_IDS
        ) {
          const trimmed =
            Array.from(
              processedIdsRef.current,
            ).slice(
              -MAX_PROCESSED_IDS,
            );

          processedIdsRef.current =
            new Set(trimmed);
        }

        saveProcessedNotificationIds(
          currentUserId,
          processedIdsRef.current,
        );
      };

    /*
     * ========================================================
     * عرض الإشعار أمام المستخدم
     * ========================================================
     */

    const showNotification =
      async (
        notification: IncomingNotification,
        options?: {
          playSound?: boolean;
          restoreFromBackground?: boolean;
        },
      ) => {
        if (
          disposedRef.current
        ) {
          return;
        }

        const notificationId =
          notification.id;

        if (!notificationId) {
          return;
        }

        /*
         * منع تكرار نفس الإشعار.
         */
        if (
          processedIdsRef.current.has(
            notificationId,
          )
        ) {
          return;
        }

        /*
         * نسجل الإشعار قبل العرض
         * لمنع التكرار في حالة حدوث
         * تحديثات أو إعادة تحميل سريعة.
         */
        markProcessed(
          notificationId,
        );

        /*
         * الصوت
         */
        if (
          options?.playSound !==
          false
        ) {
          await playForNotification();
        }

        /*
         * ====================================================
         * إشعار داخل التطبيق
         * ====================================================
         */

        const title =
          notification.title ||
          "إشعار من شهارة 🔔";

        const body =
          notification.body ||
          "لديك إشعار جديد من شهارة.";

        toast(
          title,
          {
            description:
              body,

            duration:
              options?.restoreFromBackground
                ? 20000
                : 15000,

            icon: (
              <Bell className="h-5 w-5 text-primary" />
            ),

            action:
              notification.link_url
                ? {
                    label:
                      "فتح",
                    onClick: () => {
                      window.location.href =
                        notification.link_url ||
                        "/";
                    },
                  }
                : undefined,
          },
        );
      };

    /*
     * ========================================================
     * محاولة إعادة تشغيل الأصوات عند التفاعل
     * ========================================================
     */

    const handleUserInteraction =
      () => {
        unlockAudio();

        if (
          pendingSoundCountRef.current >
          0
        ) {
          const count =
            pendingSoundCountRef.current;

          pendingSoundCountRef.current =
            0;

          void playPendingSounds(
            count,
          );
        }
      };

    /*
     * ========================================================
     * Preload
     * ========================================================
     */

    preloadAudio();

    /*
     * ========================================================
     * User interaction listeners
     * ========================================================
     */

    window.addEventListener(
      "pointerdown",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "touchstart",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "click",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "focus",
      handleUserInteraction,
    );

    /*
     * ========================================================
     * Visibility
     * ========================================================
     */

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          preloadAudio();

          unlockAudio();

          /*
           * عند عودة التطبيق من الخلفية،
           * نبحث عن الإشعارات التي وصلت
           * أثناء الغياب.
           */
          void loadMissedNotifications();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /*
     * ========================================================
     * جلب الإشعارات التي وصلت أثناء إغلاق التطبيق
     * ========================================================
     */

    async function loadMissedNotifications() {
      if (
        disposedRef.current
      ) {
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select(
            "id,user_id,title,body,kind,link_url,is_read,created_at",
          )
          .eq(
            "user_id",
            currentUserId,
          )
          .eq(
            "is_read",
            false,
          )
          .order(
            "created_at",
            {
              ascending: true,
            },
          )
          .limit(20);

        if (error) {
          console.warn(
            "تعذر تحميل الإشعارات الفائتة:",
            error,
          );

          return;
        }

        if (
          !data ||
          data.length === 0
        ) {
          return;
        }

        /*
         * لا نعرض الإشعارات التي تمت
         * معالجتها بالفعل أثناء الجلسة.
         */
        const missed =
          data.filter(
            (
              notification,
            ) =>
              Boolean(
                notification.id,
              ) &&
              !processedIdsRef.current.has(
                notification.id,
              ),
          );

        if (
          missed.length === 0
        ) {
          return;
        }

        /*
         * عرض الإشعارات بالترتيب.
         */
        for (
          const notification of missed
        ) {
          if (
            disposedRef.current
          ) {
            break;
          }

          await showNotification(
            notification,
            {
              playSound:
                true,
              restoreFromBackground:
                true,
            },
          );
        }
      } catch (error) {
        console.warn(
          "خطأ أثناء استرجاع الإشعارات الفائتة:",
          error,
        );
      }
    }

    /*
     * ========================================================
     * الاشتراك الفوري Realtime
     * ========================================================
     */

    const channel =
      supabase
        .channel(
          `user-notifications-${currentUserId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter:
              `user_id=eq.${currentUserId}`,
          },
          async (
            payload,
          ) => {
            if (
              disposedRef.current
            ) {
              return;
            }

            const notification =
              payload.new as IncomingNotification;

            await showNotification(
              notification,
              {
                playSound:
                  true,
                restoreFromBackground:
                  false,
              },
            );
          },
        )
        .subscribe(
          (status) => {
            if (
              status ===
              "SUBSCRIBED"
            ) {
              console.info(
                "تم تفعيل قناة إشعارات شهارة.",
              );
            }

            if (
              status ===
              "CHANNEL_ERROR"
            ) {
              console.error(
                "تعذر الاشتراك في قناة إشعارات شهارة.",
              );
            }

            if (
              status ===
              "TIMED_OUT"
            ) {
              console.warn(
                "انتهت مهلة قناة إشعارات شهارة.",
              );
            }
          },
        );

    /*
     * ========================================================
     * مهم:
     *
     * ننتظر قليلاً حتى يثبت اشتراك Realtime
     * ثم نجلب الإشعارات الفائتة.
     *
     * هذا يمنع فقد إشعار يصل أثناء
     * عملية فتح التطبيق.
     * ========================================================
     */

    const missedNotificationsTimer =
      window.setTimeout(() => {
        void loadMissedNotifications();
      }, 350);

    /*
     * ========================================================
     * تهيئة الصوت
     * ========================================================
     */

    unlockAudio();

    /*
     * ========================================================
     * Cleanup
     * ========================================================
     */

    return () => {
      disposedRef.current =
        true;

      window.clearTimeout(
        missedNotificationsTimer,
      );

      window.removeEventListener(
        "pointerdown",
        handleUserInteraction,
      );

      window.removeEventListener(
        "touchstart",
        handleUserInteraction,
      );

      window.removeEventListener(
        "click",
        handleUserInteraction,
      );

      window.removeEventListener(
        "keydown",
        handleUserInteraction,
      );

      window.removeEventListener(
        "focus",
        handleUserInteraction,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = "";
          audioRef.current.load();
        } catch {
          // تجاهل.
        }

        audioRef.current = null;
      }

      pendingSoundCountRef.current =
        0;

      soundRetryActiveRef.current =
        false;

      audioUnlockedRef.current =
        false;
    };
  }, [currentUserId]);

  return null;
}

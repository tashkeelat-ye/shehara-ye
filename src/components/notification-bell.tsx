import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export function NotificationBell() {
  const { user } = useAuth();

  const [open, setOpen] =
    useState(false);

  const [mounted, setMounted] =
    useState(false);

  const queryClient =
    useQueryClient();

  const userId =
    user?.id ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: items = [],
    isLoading,
  } = useQuery({
    queryKey: [
      "notifications",
      userId,
    ],

    queryFn: () =>
      fetchNotifications(userId),

    enabled:
      Boolean(userId),

    refetchInterval:
      30_000,

    staleTime:
      10_000,
  });

  const unread =
    items.filter(
      (notification) =>
        !notification.is_read,
    ).length;

  const invalidate =
    async () => {
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "notifications",
            userId,
          ],
        },
      );
    };

  const handleMarkAllRead =
    async () => {
      if (!userId) {
        return;
      }

      await markAllNotificationsRead(
        userId,
      );

      await invalidate();
    };

  const handleDelete =
    async (
      notificationId: string,
    ) => {
      await deleteNotification(
        notificationId,
      );

      await invalidate();
    };

  const handleMarkRead =
    async (
      notificationId: string,
    ) => {
      await markNotificationRead(
        notificationId,
      );

      await invalidate();
    };

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="الإشعارات"
        title="الإشعارات"
        className="
          relative
          grid
          h-10
          w-10
          place-items-center
          rounded-xl
          text-foreground
          transition-colors
          hover:bg-accent
          active:scale-95
        "
      >
        <Bell
          className="h-5 w-5"
          strokeWidth={2}
        />
      </Link>
    );
  }

  const modalContent =
    open ? (
      <div
        className="
          fixed
          inset-0
          z-[99999]
          flex
          items-center
          justify-center
          p-4
          dir-rtl
        "
      >
        <button
          type="button"
          aria-label="إغلاق الإشعارات"
          onClick={() =>
            setOpen(false)
          }
          className="
            fixed
            inset-0
            bg-black/60
            backdrop-blur-sm
          "
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-title"
          className="
            relative
            z-10
            flex
            max-h-[82dvh]
            w-full
            max-w-sm
            flex-col
            overflow-hidden
            rounded-3xl
            border
            border-border
            bg-card
            shadow-2xl
          "
        >
          <header
            className="
              flex
              shrink-0
              items-center
              justify-between
              gap-3
              border-b
              border-border
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Bell
                  className="h-5 w-5"
                  strokeWidth={2}
                />
              </span>

              <div>
                <h2
                  id="notifications-title"
                  className="
                    text-sm
                    font-extrabold
                    text-foreground
                  "
                >
                  الإشعارات
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-muted-foreground
                  "
                >
                  {unread > 0
                    ? `${unread.toLocaleString(
                        "ar-EG",
                      )} غير مقروءة`
                    : "لا توجد إشعارات غير مقروءة"}
                </p>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-1
              "
            >
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={
                    handleMarkAllRead
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-1
                    rounded-lg
                    px-2
                    text-[10px]
                    font-bold
                    text-primary
                    transition-colors
                    hover:bg-primary/10
                  "
                >
                  <CheckCheck
                    className="h-4 w-4"
                  />

                  <span>
                    تعليم الكل
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                aria-label="إغلاق"
                onClick={() =>
                  setOpen(false)
                }
                className="
                  grid
                  h-9
                  w-9
                  place-items-center
                  rounded-xl
                  text-muted-foreground
                  transition-colors
                  hover:bg-accent
                  hover:text-foreground
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              p-3
            "
          >
            {isLoading ? (
              <div
                className="
                  flex
                  min-h-40
                  items-center
                  justify-center
                  text-xs
                  text-muted-foreground
                "
              >
                جاري تحميل الإشعارات...
              </div>
            ) : items.length === 0 ? (
              <div
                className="
                  flex
                  min-h-56
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <span
                  className="
                    grid
                    h-14
                    w-14
                    place-items-center
                    rounded-2xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <Bell
                    className="h-7 w-7"
                    strokeWidth={1.7}
                  />
                </span>

                <p
                  className="
                    mt-4
                    text-sm
                    font-bold
                    text-foreground
                  "
                >
                  لا توجد إشعارات
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  ستظهر إشعارات الطلبات
                  والتحديثات هنا.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map(
                  (notification) => (
                    <li
                      key={
                        notification.id
                      }
                      className={[
                        "rounded-2xl border p-3",
                        "transition-colors",
                        notification.is_read
                          ? "border-border bg-card"
                          : "border-primary/25 bg-primary/[0.05]",
                      ].join(" ")}
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <span
                          className="
                            mt-0.5
                            grid
                            h-9
                            w-9
                            shrink-0
                            place-items-center
                            rounded-xl
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Bell
                            className="h-4 w-4"
                            strokeWidth={2}
                          />
                        </span>

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-extrabold
                              text-foreground
                            "
                          >
                            {
                              notification.title
                            }
                          </p>

                          {notification.body ? (
                            <p
                              className="
                                mt-1
                                text-[11px]
                                leading-6
                                text-muted-foreground
                              "
                            >
                              {
                                notification.body
                              }
                            </p>
                          ) : null}

                          <time
                            dateTime={
                              notification.created_at
                            }
                            className="
                              mt-1.5
                              block
                              text-[9px]
                              text-muted-foreground/80
                            "
                          >
                            {new Date(
                              notification.created_at,
                            ).toLocaleString(
                              "ar-EG",
                            )}
                          </time>

                          {notification.link_url ? (
                            <Link
                              to={
                                notification.link_url
                              }
                              onClick={
                                async () => {
                                  await handleMarkRead(
                                    notification.id,
                                  );

                                  setOpen(false);
                                }
                              }
                              className="
                                mt-2
                                inline-flex
                                min-h-8
                                items-center
                                rounded-lg
                                bg-primary/10
                                px-2.5
                                text-[10px]
                                font-bold
                                text-primary
                                hover:bg-primary/15
                              "
                            >
                              عرض التفاصيل
                            </Link>
                          ) : !notification.is_read ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkRead(
                                  notification.id,
                                )
                              }
                              className="
                                mt-2
                                text-[10px]
                                font-bold
                                text-primary
                                hover:underline
                              "
                            >
                              تعليم كمقروء
                            </button>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          aria-label="حذف الإشعار"
                          title="حذف الإشعار"
                          onClick={() =>
                            handleDelete(
                              notification.id,
                            )
                          }
                          className="
                            grid
                            h-8
                            w-8
                            shrink-0
                            place-items-center
                            rounded-lg
                            text-muted-foreground
                            transition-colors
                            hover:bg-destructive/10
                            hover:text-destructive
                          "
                        >
                          <Trash2
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </section>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="الإشعارات"
        title="الإشعارات"
        aria-expanded={open}
        onClick={() =>
          setOpen((value) => !value)
        }
        className="
          relative
          grid
          h-10
          w-10
          place-items-center
          rounded-xl
          text-foreground
          transition-colors
          hover:bg-accent
          active:scale-95
        "
      >
        <Bell
          className="h-5 w-5"
          strokeWidth={2}
        />

        {unread > 0 ? (
          <span
            aria-label={`${unread} إشعار غير مقروء`}
            className="
              absolute
              -end-1
              -top-1
              grid
              min-h-5
              min-w-5
              place-items-center
              rounded-full
              bg-primary
              px-1
              text-[9px]
              font-extrabold
              text-primary-foreground
              shadow-sm
              ring-2
              ring-background
            "
          >
            {unread > 99
              ? "99+"
              : unread.toLocaleString(
                  "ar-EG",
                )}
          </span>
        ) : null}
      </button>

      {mounted && modalContent
        ? createPortal(
            modalContent,
            document.body,
          )
        : null}
    </>
  );
}

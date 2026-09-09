import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BOGjwmnqUsfAkzMnKpQ2--b3WyTW-QjmClUt3-QXNF4g_aATBnFPcDWgk7gS1swL0UZWJBlj16Aj1_BkafdyEjk";

function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4,
  );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0),
    ),
  );
}

export async function registerPushNotifications() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }

  try {
    const { data: sessionData } =
      await supabase.auth.getSession();

    const user =
      sessionData.session?.user;

    if (!user) {
      return false;
    }

    const registration =
      await navigator.serviceWorker.ready;

    let permission =
      Notification.permission;

    if (permission === "default") {
      permission =
        await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return false;
    }

    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              VAPID_PUBLIC_KEY,
            ),
        });
    }

    const subscriptionJson =
      subscription.toJSON();

    if (
      !subscriptionJson.endpoint ||
      !subscriptionJson.keys
    ) {
      console.error(
        "Web Push subscription is incomplete.",
      );

      return false;
    }

    const { error } =
      await supabase.rpc(
        "register_push_subscription",
        {
          _subscription:
            subscriptionJson,
          _user_agent:
            navigator.userAgent,
        },
      );

    if (error) {
      console.error(
        "تعذر حفظ اشتراك Web Push:",
        error,
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "خطأ في تسجيل إشعارات الويب:",
      error,
    );

    return false;
  }
}


export async function unregisterPushNotifications() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  try {
    const registration =
      await navigator.serviceWorker.ready;

    const subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    const endpoint =
      subscription.endpoint;

    const { error } =
      await supabase.rpc(
        "remove_push_subscription",
        {
          _endpoint: endpoint,
        },
      );

    if (error) {
      console.error(
        "تعذر إزالة اشتراك Web Push:",
        error,
      );

      return false;
    }

    await subscription.unsubscribe();

    return true;
  } catch (error) {
    console.error(
      "خطأ في إلغاء Web Push:",
      error,
    );

    return false;
  }
}

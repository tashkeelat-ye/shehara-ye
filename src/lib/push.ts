import { supabase } from "@/integrations/supabase/client";

// استبدل هذا بالمفتاح العام (Public Key) الذي ستولده لاحقاً
const VAPID_PUBLIC_KEY = "هنا_ضع_المفتاح_العام_الذي_ستولده";

export async function registerPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // طلب الصلاحية
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // الاشتراك
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });

    // حفظ الاشتراك في Supabase
    await supabase.from("user_push_subscriptions").insert({
      subscription: subscription,
    });
  } catch (error) {
    console.error("خطأ في الاشتراك:", error);
  }
}

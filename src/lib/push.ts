import { supabase } from "@/integrations/supabase/client";

// المفتاح العام المولّد من VAPID
const VAPID_PUBLIC_KEY = "BOGjwmnqUsfAkzMnKpQ2--b3WyTW-QjmClUt3-QXNF4g_aATBnFPcDWgk7gS1swL0UZWJBlj16Aj1_BkafdyEjk";

export async function registerPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // طلب الصلاحية من المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // الحصول على الاشتراك من المتصفح
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });

    // حفظ الاشتراك في قاعدة البيانات
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("user_push_subscriptions").insert({
      user_id: user?.id || null,
      subscription: JSON.parse(JSON.stringify(subscription)),
    });
  } catch (error) {
    console.error("خطأ في تسجيل إشعارات الويب:", error);
  }
}

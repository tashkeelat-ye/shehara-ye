import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  CreditCard,
  LogOut,
  MapPin,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { WalletPanel } from "@/components/wallet-panel";
import { NotificationPrefsPanel } from "@/components/notification-prefs";

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  details: string;
  is_default: boolean;
};

export const Route = createFileRoute(
  "/_authenticated/account",
)({
  head: () => ({
    meta: [
      {
        title: "حسابي | تشكيلات",
      },
      {
        name: "description",
        content:
          "إدارة حسابك وبياناتك وعناوين التوصيل في تشكيلات.",
      },
      {
        property: "og:title",
        content: "حسابي | تشكيلات",
      },
      {
        property: "og:description",
        content:
          "إدارة الحساب والعناوين في متجر تشكيلات.",
      },
    ],
  }),
  component: AccountPage,
});

const emptyAddress = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

function AccountPage() {
  const {
    user,
    profile,
    refreshProfile,
    signOut,
  } = useAuth();

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [form, setForm] =
    useState(emptyAddress);

  const [busy, setBusy] =
    useState(false);

  const [savingAddress, setSavingAddress] =
    useState(false);

  useEffect(() => {
    setFullName(
      profile?.full_name ?? "",
    );

    setPhone(
      profile?.phone ?? "",
    );
  }, [profile]);

  const loadAddresses = async () => {
    if (!user?.id) {
      setAddresses([]);
      return;
    }

    const { data, error } =
      await supabase
        .from("addresses")
        .select(
          "id,label,recipient_name,phone,city,district,details,is_default",
        )
        .eq("user_id", user.id)
        .order("created_at")
        .returns<Address[]>();

    if (error) {
      toast.error(
        "تعذّر تحميل عناوين التوصيل",
      );
      return;
    }

    setAddresses(data ?? []);
  };

  useEffect(() => {
    void loadAddresses();
  }, [user?.id]);

  async function saveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name =
      fullName.trim();

    if (name.length < 3) {
      toast.error(
        "أدخل اسماً صحيحاً",
      );
      return;
    }

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    setBusy(true);

    const {
      error,
    } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: phone.trim(),
      })
      .eq("id", user.id);

    setBusy(false);

    if (error) {
      toast.error(
        "تعذّر حفظ البيانات",
      );
      return;
    }

    toast.success(
      "تم تحديث بياناتك",
    );

    await refreshProfile();
  }

  async function addAddress(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.recipient_name.trim() ||
      !form.city.trim() ||
      !form.details.trim()
    ) {
      toast.error(
        "أكمل بيانات العنوان الأساسية",
      );
      return;
    }

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    setSavingAddress(true);

    const {
      error,
    } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        label: form.label.trim(),
        recipient_name:
          form.recipient_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        details: form.details.trim(),
        is_default:
          addresses.length === 0,
      });

    setSavingAddress(false);

    if (error) {
      toast.error(
        "تعذّر إضافة العنوان",
      );
      return;
    }

    toast.success(
      "تمت إضافة العنوان",
    );

    setForm({
      ...emptyAddress,
    });

    await loadAddresses();
  }

  async function removeAddress(
    id: string,
  ) {
    if (!window.confirm("هل تريد حذف هذا العنوان؟")) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (error) {
      toast.error(
        "تعذّر حذف العنوان",
      );
      return;
    }

    toast.success(
      "تم حذف العنوان",
    );

    await loadAddresses();
  }

  async function makeDefault(
    id: string,
  ) {
    if (!user?.id) {
      return;
    }

    const {
      error: resetError,
    } = await supabase
      .from("addresses")
      .update({
        is_default: false,
      })
      .eq("user_id", user.id);

    if (resetError) {
      toast.error(
        "تعذّر تحديث العنوان الافتراضي",
      );
      return;
    }

    const {
      error,
    } = await supabase
      .from("addresses")
      .update({
        is_default: true,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error(
        "تعذّر تعيين العنوان",
      );
      return;
    }

    toast.success(
      "تم تعيين العنوان الافتراضي",
    );

    await loadAddresses();
  }

  const displayName = useMemo(() => {
    const name =
      profile?.full_name?.trim();

    if (name) {
      return name;
    }

    return "عميل تشكيلات";
  }, [profile?.full_name]);

  const initials = useMemo(() => {
    const parts =
      displayName
        .split(/\s+/

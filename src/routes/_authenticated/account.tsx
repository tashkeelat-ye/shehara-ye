import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronLeft,
  Edit3,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { NotificationPrefsPanel } from "@/components/notification-prefs";
import { useFormatPrice } from "@/lib/currency-context";
import {
  PAYMENT_STATUS_LABELS,
  formatDate,
} from "@/lib/store";

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

type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const emptyAddress: Omit<Address, "id" | "is_default"> = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
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
          "إدارة حسابك وطلباتك ومحفظتك وعناوين التوصيل في تشكيلات.",
      },
      {
        property: "og:title",
        content: "حسابي | تشكيلات",
      },
      {
        property: "og:description",
        content:
          "إدارة الحساب والطلبات والمحفظة في متجر تشكيلات.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const {
    user,
    profile,
    role,
    refreshProfile,
    signOut,
  } = useAuth();

  const formatPrice = useFormatPrice();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [orders, setOrders] =
    useState<RecentOrder[]>([]);

  const [form, setForm] =
    useState(emptyAddress);

  const [busy, setBusy] = useState(false);

  const [loadingAddresses, setLoadingAddresses] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const loadAddresses =
    useCallback(async () => {
      if (!user?.id) {
        setLoadingAddresses(false);
        return;
      }

      setLoadingAddresses(true);

      const { data, error } =
        await supabase
          .from("addresses")
          .select(
            "id,label,recipient_name,phone,city,district,details,is_default",
          )
          .eq("user_id", user.id)
          .order("is_default", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
          .returns<Address[]>();

      if (error) {
        console.error(
          "[Account] Failed to load addresses:",
          error,
        );

        toast.error(
          "تعذر تحميل عناوين التوصيل",
        );
      }

      setAddresses(data ?? []);
      setLoadingAddresses(false);
    }, [user?.id]);

  const loadOrders =
    useCallback(async () => {
      if (!user?.id) {
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);

      const { data, error } =
        await supabase
          .from("orders")
          .select(
            "id,order_number,status,payment_status,total,created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(3)
          .returns<RecentOrder[]>();

      if (error) {
        console.error(
          "[Account] Failed to load orders:",
          error,
        );

        toast.error(
          "تعذر تحميل الطلبات",
        );
      }

      setOrders(data ?? []);
      setLoadingOrders(false);
    }, [user?.id]);

  useEffect(() => {
    setFullName(
      profile?.full_name ?? "",
    );

    setPhone(
      profile?.phone ?? "",
    );
  }, [profile]);

  useEffect(() => {
    void loadAddresses();
    void loadOrders();
  }, [
    loadAddresses,
    loadOrders,
  ]);

  const roleLabel = useMemo(() => {
    switch (role) {
      case "admin":
        return "مدير";

      case "vendor":
        return "تاجر";

      case "courier":
        return "عامل توصيل";

      default:
        return "عميل";
    }
  }, [role]);

  const initials = useMemo(() => {
    const value =
      profile?.full_name?.trim() || "ت";

    const parts =
      value
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  const getOrderStatusLabel =
    useCallback(
      (status: string) => {
        return (
          STATUS_LABELS[status] ??
          status ??
          "غير معروف"
        );
      },
      [],
    );

  const getPaymentStatusLabel =
    useCallback(
      (status: string) => {
        return (
          PAYMENT_STATUS_LABELS[
            status as keyof typeof PAYMENT_STATUS_LABELS
          ] ??
          status ??
          "غير معروف"
        );
      },
      [],
    );

  async function saveProfile(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    if (
      fullName.trim().length < 3
    ) {
      toast.error(
        "أدخل اسماً صحيحاً",
      );
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase
          .from("profiles")
          .update({
            full_name:
              fullName.trim(),
            phone: phone.trim(),
          })
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();

      toast.success(
       

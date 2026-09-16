import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileImage,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AdminCard,
  btnCls,
  btnGhostCls,
} from "@/components/admin-ui";

import { supabase } from "@/integrations/supabase/client";

import {
  fetchPaymentRequests,
  formatDateTime,
  PAYMENT_REQUEST_PURPOSE_LABELS,
  PAYMENT_REQUEST_STATUS_LABELS,
  type PaymentRequest,
} from "@/lib/store";

type ProfileInfo = {
  id: string;
  full_name: string;
  phone: string | null;
};

type ReviewAction =
  | "approve"
  | "reject";

function money(
  amount: number,
  currency: string,
) {
  return `${Number(
    amount ?? 0,
  ).toLocaleString(
    "ar-YE",
  )} ${currency}`;
}

function purposeLabel(
  purpose: string,
) {
  return (
    PAYMENT_REQUEST_PURPOSE_LABELS[
      purpose
    ] ??
    purpose ??
    "عملية مالية"
  );
}

function statusClass(
  status: string,
) {
  if (
    status ===
    "approved"
  ) {
    return "bg-primary/10 text-primary";
  }

  if (
    status ===
    "rejected"
  ) {
    return "bg-destructive/10 text-destructive";
  }

  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function PaymentRequestsManager() {
  const [
    requests,
    setRequests,
  ] = useState<PaymentRequest[]>(
    [],
  );

  const [
    profiles,
    setProfiles,
  ] = useState<
    Record<
      string,
      ProfileInfo
    >
  >({});

  const [
    receiptUrls,
    setReceiptUrls,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] =
    useState<PaymentRequest | null>(
      null,
    );

  const [
    action,
    setAction,
  ] =
    useState<ReviewAction | null>(
      null,
    );

  const [
    note,
    setNote,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const load =
    useCallback(
      async (
        refresh = false,
      ) => {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const list =
            await fetchPaymentRequests();

          setRequests(
            list,
          );

          const userIds =
            Array.from(
              new Set(
                list.map(
                  (item) =>
                    item.user_id,
                ),
              ),
            );

          if (
            userIds.length
          ) {
            const {
              data:
                profileRows,
              error:
                profileError,
            } =
              await supabase
                .from(
                  "profiles",
                )
                .select(
                  "id,full_name,phone",
                )
                .in(
                  "id",
                  userIds,
                );

            if (
              profileError
            ) {
              console.warn(
                "[PaymentRequestsManager] profiles:",
                profileError,
              );
            } else {
              setProfiles(
                Object.fromEntries(
                  (
                    profileRows ??
                    []
                  ).map(
                    (
                      profile,
                    ) => [
                      profile.id,
                      profile as ProfileInfo,
                    ],
                  ),
                ),
              );
            }
          }

          const signedEntries =
            await Promise.all(
              list
                .filter(
                  (
                    request,
                  ) =>
                    Boolean(
                      request.receipt_path,
                    ),
                )
                .map(
                  async (
                    request,
                  ) => {
                    const {
                      data,
                      error,
                    } =
                      await supabase.storage
                        .from(
                          "receipts",
                        )
                        .createSignedUrl(
                          request.receipt_path,
                          3600,
                        );

                    return [
                      request.id,
                      error
                        ? ""
                        : data?.signedUrl ??
                          "",
                    ] as const;
                  },
                ),
            );

          setReceiptUrls(
            Object.fromEntries(
              signedEntries,
            ),
          );
        } catch (error) {
          console.error(
            "[PaymentRequestsManager] load:",
            error,
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "تعذر تحميل طلبات الدفع.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const pending =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            request.status ===
            "pending",
        ),
      [requests],
    );

  const reviewed =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            request.status !==
            "pending",
        ),
      [requests],
    );

  function openReview(
    request: PaymentRequest,
  ) {
    setSelected(
      request,
    );
    setAction(null);
    setNote("");
  }

  function closeReview() {
    if (processing) {
      return;
    }

    setSelected(null);
    setAction(null);
    setNote("");
  }

  function getRpc(
    request: PaymentRequest,
    reviewAction: ReviewAction,
  ) {
    const approve =
      reviewAction ===
      "approve";

    if (
      request.purpose ===
      "topup"
    ) {
      return {
        name: approve
          ? "approve_wallet_topup"
          : "reject_wallet_topup",
        params: {
          _payment_request_id:
            request.id,
          _note: note.trim(),
        },
      };
    }

    if (
      request.purpose ===
      "refund"
    ) {
      return {
        name: approve
          ? "approve_wallet_refund"
          : "reject_wallet_refund",
        params: {
          _payment_request_id:
            request.id,
          _note: note.trim(),
        },
      };
    }

    return {
      name:
        "review_payment_request",
      params: {
        _id: request.id,
        _approve: approve,
        _note: note.trim(),
      },
    };
  }

  async function submitReview() {
    if (
      !selected ||
      !action ||
      processing
    ) {
      return;
    }

    if (
      action ===
        "reject" &&
      !note.trim()
    ) {
      toast.error(
        "اكتب سبب الرفض قبل المتابعة.",
      );
      return;
    }

    setProcessing(true);

    try {
      const rpc =
        getRpc(
          selected,
          action,
        );

      const {
        error,
      } = await supabase.rpc(
        rpc.name,
        rpc.params as never,
      );

      if (error) {
        throw error;
      }

      toast.success(
        action ===
          "approve"
          ? "تم اعتماد العملية بنجاح."
          : "تم رفض العملية وتسجيل السبب.",
      );

      closeReview();

      await load(
        true,
      );
    } catch (error) {
      console.error(
        "[PaymentRequestsManager] review:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تنفيذ العملية.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <>
      <div
        dir="rtl"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              العمليات المالية
            </p>

            <h1 className="mt-1 text-xl font-black">
              طلبات الدفع
            </h1>

            <p className="mt-1 text-[10px] text-muted-foreground">
              مراجعة واعتماد عمليات الدفع والشحن والاسترداد.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void load(
                true,
              )
            }
            disabled={
              refreshing
            }
            className={btnGhostCls}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            تحديث
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <Clock3 className="h-5 w-5 text-amber-600" />

            <p className="mt-3 text-[10px] text-muted-foreground">
              قيد المراجعة
            </p>

            <p className="mt-1 text-2xl font-black">
              {pending.length.toLocaleString(
                "ar-EG",
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />

            <p className="mt-3 text-[10px] text-muted-foreground">
              إجمالي العمليات
            </p>

            <p className="mt-1 text-2xl font-black">
              {requests.length.toLocaleString(
                "ar-EG",
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <CreditCard className="h-5 w-5 text-primary" />

            <p className="mt-3 text-[10px] text-muted-foreground">
              طلبات مالية
            </p>

            <p className="mt-1 text-2xl font-black">
              {requests.filter(
                (request) =>
                  request.purpose !==
                  "order",
              ).length.toLocaleString(
                "ar-EG",
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <FileImage className="h-5 w-5 text-primary" />

            <p className="mt-3 text-[10px] text-muted-foreground">
              إيصالات مرفقة
            </p>

            <p className="mt-1 text-2xl font-black">
              {requests.filter(
                (request) =>
                  Boolean(
                    request.receipt_path,
                  ),
              ).length.toLocaleString(
                "ar-EG",
              )}
            </p>
          </div>
        </div>

        <AdminCard
          title={`طلبات الدفع المعلقة (${pending.length.toLocaleString(
            "ar-EG",
          )})`}
        >
          {pending.length ===
          0 ? (
            <div className="rounded-2xl border border-border/70 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />

              <p className="mt-3 text-sm font-bold">
                لا توجد عمليات معلقة
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground">
                جميع طلبات الدفع تمت مراجعتها.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(
                (request) => {
                  const profile =
                    profiles[
                      request.user_id
                    ];

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="rounded-2xl border border-border/70 bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <CreditCard className="h-5 w-5" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-black">
                              {purposeLabel(
                                request.purpose,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {profile?.full_name ||
                                request.sender_name ||
                                "عميل"}
                            </p>
                          </div>
                        </div>

                        <div className="text-left">
                          <p className="text-lg font-black text-primary">
                            {money(
                              request.amount,
                              request.currency,
                            )}
                          </p>

                          <p className="mt-1 text-[9px] text-muted-foreground">
                            {formatDateTime(
                              request.created_at,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-secondary/40 p-3">
                          <p className="text-[9px] text-muted-foreground">
                            طريقة الدفع
                          </p>

                          <p className="mt-1 text-xs font-bold">
                            {
                              request.method_code
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-secondary/40 p-3">
                          <p className="text-[9px] text-muted-foreground">
                            الهاتف
                          </p>

                          <p className="mt-1 text-xs font-bold">
                            {profile?.phone ||
                              request.sender_phone ||
                              "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-secondary/40 p-3">
                          <p className="text-[9px] text-muted-foreground">
                            المرجع
                          </p>

                          <p className="mt-1 truncate text-xs font-bold">
                            {request.reference ||
                              "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-secondary/40 p-3">
                          <p className="text-[9px] text-muted-foreground">
                            رقم الطلب
                          </p>

                          <p className="mt-1 truncate text-xs font-bold">
                            {request.order_id ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.receipt_path ? (
                          <button
                            type="button"
                            onClick={() =>
                              openReview(
                                request,
                              )
                            }
                            className={btnGhostCls}
                          >
                            <Eye className="h-4 w-4" />
                            مراجعة الإيصال
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            openReview(
                              request,
                            )
                          }
                          className={btnCls}
                        >
                          مراجعة العملية
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </AdminCard>

        <AdminCard
          title={`سجل العمليات (${reviewed.length.toLocaleString(
            "ar-EG",
          )})`}
        >
          {reviewed.length ===
          0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد عمليات مراجعة سابقة.
            </p>
          ) : (
            <div className="space-y-2">
              {reviewed.map(
                (request) => (
                  <button
                    key={
                      request.id
                    }
                    type="button"
                    onClick={() =>
                      openReview(
                        request,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-right"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${statusClass(
                        request.status,
                      )}`}
                    >
                      {request.status ===
                      "approved" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">
                        {purposeLabel(
                          request.purpose,
                        )}
                      </p>

                      <p className="mt-1 text-[9px] text-muted-foreground">
                        {formatDateTime(
                          request.created_at,
                        )}
                      </p>
                    </div>

                    <div className="text-left">
                      <p className="text-xs font-black">
                        {money(
                          request.amount,
                          request.currency,
                        )}
                      </p>

                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${statusClass(
                          request.status,
                        )}`}
                      >
                        {
                          PAYMENT_REQUEST_STATUS_LABELS[
                            request.status
                          ] ??
                            request.status
                        }
                      </span>
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </AdminCard>
      </div>

      <Dialog
        open={Boolean(
          selected,
        )}
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !processing
          ) {
            closeReview();
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              مراجعة طلب الدفع
            </DialogTitle>

            <DialogDescription>
              تحقق من بيانات العملية والإيصال قبل اعتمادها أو رفضها.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black">
                        {profiles[
                          selected.user_id
                        ]?.full_name ||
                          selected.sender_name ||
                          "عميل"}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {profiles[
                          selected.user_id
                        ]?.phone ||
                          selected.sender_phone ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <p className="text-lg font-black text-primary">
                    {money(
                      selected.amount,
                      selected.currency,
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[9px] text-muted-foreground">
                    نوع العملية
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    {purposeLabel(
                      selected.purpose,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[9px] text-muted-foreground">
                    طريقة الدفع
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    {
                      selected.method_code
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[9px] text-muted-foreground">
                    المرجع
                  </p>

                  <p className="mt-1 break-all text-xs font-bold">
                    {selected.reference ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-[9px] text-muted-foreground">
                    تاريخ الطلب
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    {formatDateTime(
                      selected.created_at,
                    )}
                  </p>
                </div>
              </div>

              {receiptUrls[
                selected.id
              ] ? (
                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <div className="flex items-center gap-2 border-b border-border/60 p-3">
                    <FileImage className="h-4 w-4 text-primary" />

                    <span className="text-xs font-bold">
                      إيصال التحويل
                    </span>
                  </div>

                  <a
                    href={
                      receiptUrls[
                        selected.id
                      ]
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-secondary/30 p-3"
                  >
                    <img
                      src={
                        receiptUrls[
                          selected.id
                        ]
                      }
                      alt="إيصال التحويل"
                      className="mx-auto max-h-[420px] w-auto max-w-full rounded-xl object-contain"
                    />
                  </a>
                </div>
              ) : selected.receipt_path ? (
                <div className="rounded-xl bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
                  تعذر تحميل صورة الإيصال.
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                  لا يوجد إيصال مرفق بهذه العملية.
                </div>
              )}

              {selected.status ===
              "pending" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAction(
                          "approve",
                        )
                      }
                      className={`flex-1 rounded-xl border px-4 py-3 text-xs font-black ${
                        action ===
                        "approve"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/30 bg-primary/5 text-primary"
                      }`}
                    >
                      <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                      اعتماد العملية
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAction(
                          "reject",
                        )
                      }
                      className={`flex-1 rounded-xl border px-4 py-3 text-xs font-black ${
                        action ===
                        "reject"
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-destructive/30 bg-destructive/5 text-destructive"
                      }`}
                    >
                      <XCircle className="mx-auto mb-1 h-5 w-5" />
                      رفض العملية
                    </button>
                  </div>

                  {action ===
                  "reject" ? (
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-border bg-secondary p-3 text-sm outline-none focus:border-primary"
                      placeholder="اكتب سبب الرفض..."
                      value={note}
                      maxLength={1000}
                      onChange={(
                        event,
                      ) =>
                        setNote(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  ) : null}

                  {action ===
                  "approve" ? (
                    <div className="rounded-xl bg-primary/5 p-3 text-[10px] leading-5 text-muted-foreground">
                      سيتم تنفيذ عملية الاعتماد عبر النظام المالي الآمن وتحديث العملية والطلب/المحفظة وفق نوعها.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className={`rounded-xl p-4 text-center text-xs font-bold ${statusClass(
                    selected.status,
                  )}`}
                >
                  حالة العملية:{" "}
                  {
                    PAYMENT_REQUEST_STATUS_LABELS[
                      selected.status
                    ] ??
                      selected.status
                  }
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <button
              type="button"
              className={btnGhostCls}
              disabled={
                processing
              }
              onClick={
                closeReview
              }
            >
              إغلاق
            </button>

            {selected?.status ===
              "pending" &&
            action ? (
              <button
                type="button"
                className={
                  action ===
                  "approve"
                    ? btnCls
                    : `${btnCls} bg-destructive`
                }
                disabled={
                  processing
                }
                onClick={() =>
                  void submitReview()
                }
              >
                {processing
                  ? "جارٍ التنفيذ..."
                  : action ===
                      "approve"
                    ? "تأكيد الاعتماد"
                    : "تأكيد الرفض"}
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

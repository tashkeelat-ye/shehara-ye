import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  "";

const SMS_GATEWAY_URL =
  Deno.env.get("SMS_GATEWAY_URL") ??
  "https://sms-gateway.app";

const SMS_GATEWAY_TOKEN =
  Deno.env.get("SMS_GATEWAY_TOKEN") ??
  "";

const SMS_GATEWAY_NODE_ID =
  Deno.env.get("SMS_GATEWAY_NODE_ID") ??
  "11343";

const SMS_GATEWAY_SIM_INDEX =
  Deno.env.get("SMS_GATEWAY_SIM_INDEX") ??
  "2";

const SMS_ADMIN_PHONE =
  Deno.env.get("SMS_ADMIN_PHONE") ??
  "";

if (!SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL is not configured.",
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not configured.",
  );
}

if (!SMS_GATEWAY_TOKEN) {
  throw new Error(
    "SMS_GATEWAY_TOKEN is not configured.",
  );
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

type OrderRecord = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district?: string | null;
  shipping_details?: string | null;
  shipping_landmark?: string | null;
  courier_id?: string | null;
};

type WebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: OrderRecord | null;
  old_record?: OrderRecord | null;
};

type SmsRequest = {
  to: string;
  message: string;
};

function json(
  data: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function normalizePhone(
  value: string | null | undefined,
): string {
  if (!value) {
    return "";
  }

  let phone = value.trim();

  phone = phone.replace(/[^\d+]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  if (phone.startsWith("+967")) {
    return phone;
  }

  if (phone.startsWith("967")) {
    return `+${phone}`;
  }

  if (
    /^7\d{8}$/.test(phone)
  ) {
    return `+967${phone}`;
  }

  return phone;
}

function buildAddress(
  order: OrderRecord,
): string {
  return [
    order.shipping_city,
    order.shipping_district,
    order.shipping_details,
    order.shipping_landmark,
  ]
    .filter(
      (value) =>
        Boolean(value?.trim()),
    )
    .join(" - ");
}

function buildOrderMessage(
  order: OrderRecord,
  message: string,
): string {
  return `${message}

رقم الطلب: #${order.order_number}

شهارة للتسوق`;
}

async function sendSms(
  request: SmsRequest,
) {
  const response = await fetch(
    SMS_GATEWAY_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${SMS_GATEWAY_TOKEN}`,
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
      },
      body: JSON.stringify({
        nodeId:
          Number(
            SMS_GATEWAY_NODE_ID,
          ),

        simIndex:
          Number(
            SMS_GATEWAY_SIM_INDEX,
          ),

        to: request.to,

        message:
          request.message,
      }),
    },
  );

  const responseText =
    await response.text();

  let responseData: unknown =
    responseText;

  try {
    responseData =
      JSON.parse(
        responseText,
      );
  } catch {
    // Response is not JSON.
  }

  if (!response.ok) {
    throw new Error(
      `SMS Gateway returned ${response.status}: ${responseText}`,
    );
  }

  return responseData;
}

async function sendOrderSms(
  order: OrderRecord,
  message: string,
  recipient: string,
) {
  const phone =
    normalizePhone(recipient);

  if (!phone) {
    console.warn(
      "[SMS] Missing recipient phone.",
    );

    return {
      sent: false,
      reason:
        "missing_recipient",
    };
  }

  const result =
    await sendSms({
      to: phone,
      message:
        buildOrderMessage(
          order,
          message,
        ),
    });

  return {
    sent: true,
    phone,
    result,
  };
}

async function getCourier(
  courierId: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("couriers")
    .select(
      "id,name,phone,is_active,account_enabled",
    )
    .eq("id", courierId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getOrderOwnerPhone(
  order: OrderRecord,
) {
  if (order.shipping_phone) {
    return order.shipping_phone;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("profiles")
    .select("phone")
    .eq("id", order.user_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.phone ?? "";
}

async function handleInsert(
  order: OrderRecord,
) {
  const results: unknown[] = [];

  const customerPhone =
    await getOrderOwnerPhone(
      order,
    );

  if (customerPhone) {
    results.push(
      await sendOrderSms(
        order,
        "عزيزنا العميل، تم استلام طلبك بنجاح.",
        customerPhone,
      ),
    );
  }

  if (SMS_ADMIN_PHONE) {
    results.push(
      await sendOrderSms(
        order,
        `تم استلام طلب جديد في شهارة.

العميل: ${order.shipping_name}
الهاتف: ${order.shipping_phone}
العنوان: ${buildAddress(order)}`,
        SMS_ADMIN_PHONE,
      ),
    );
  }

  return results;
}

async function handleStatusChange(
  order: OrderRecord,
  oldOrder: OrderRecord,
) {
  if (
    order.status ===
    oldOrder.status
  ) {
    return {
      skipped: true,
      reason:
        "status_not_changed",
    };
  }

  const customerPhone =
    await getOrderOwnerPhone(
      order,
    );

  const results: unknown[] = [];

  switch (
    order.status
  ) {
    case "confirmed": {
      if (customerPhone) {
        results.push(
          await sendOrderSms(
            order,
            "تم تأكيد طلبك وبدأنا العمل على تجهيزه.",
            customerPhone,
          ),
        );
      }

      break;
    }

    case "processing": {
      if (customerPhone) {
        results.push(
          await sendOrderSms(
            order,
            "طلبك الآن قيد التجهيز وسيتم تجهيزه للتوصيل.",
            customerPhone,
          ),
        );
      }

      break;
    }

    case "shipped": {
      if (customerPhone) {
        results.push(
          await sendOrderSms(
            order,
            "طلبك أصبح مع المندوب وهو الآن في طريقه إليك.",
            customerPhone,
          ),
        );
      }

      if (
        order.courier_id
      ) {
        const courier =
          await getCourier(
            order.courier_id,
          );

        if (
          courier?.phone &&
          courier.is_active &&
          courier.account_enabled
        ) {
          const courierMessage =
            `لديك طلب جديد للتوصيل.

رقم الطلب: #${order.order_number}
العميل: ${order.shipping_name}
هاتف العميل: ${order.shipping_phone}
العنوان: ${buildAddress(order)}

شهارة للتسوق`;

          results.push(
            await sendOrderSms(
              order,
              courierMessage,
              courier.phone,
            ),
          );
        }
      }

      break;
    }

    case "delivered": {
      if (customerPhone) {
        results.push(
          await sendOrderSms(
            order,
            "شكراً لك، تم تسليم طلبك بنجاح. نتمنى أن تنال تجربتك مع شهارة رضاك.",
            customerPhone,
          ),
        );
      }

      break;
    }

    default:
      break;
  }

  return results;
}

Deno.serve(
  async (request) => {
    if (
      request.method !==
      "POST"
    ) {
      return json(
        {
          error:
            "Method not allowed",
        },
        405,
      );
    }

    try {
      const payload =
        (await request.json()) as WebhookPayload;

      if (
        payload.table !==
          "orders" ||
        payload.schema !==
          "public"
      ) {
        return json(
          {
            ok: true,
            skipped: true,
            reason:
              "not_orders_table",
          },
        );
      }

      if (
        payload.type ===
        "DELETE"
      ) {
        return json({
          ok: true,
          skipped: true,
          reason:
            "delete_event",
        });
      }

      const order =
        payload.record;

      if (!order) {
        return json(
          {
            ok: true,
            skipped: true,
            reason:
              "missing_record",
          },
        );
      }

      let results: unknown[] =
        [];

      if (
        payload.type ===
        "INSERT"
      ) {
        results =
          await handleInsert(
            order,
          );
      } else if (
        payload.type ===
        "UPDATE"
      ) {
        const oldOrder =
          payload.old_record;

        if (!oldOrder) {
          return json({
            ok: true,
            skipped: true,
            reason:
              "missing_old_record",
          });
        }

        results =
          await handleStatusChange(
            order,
            oldOrder,
          );
      }

      return json({
        ok: true,
        type:
          payload.type,
        order_id:
          order.id,
        order_number:
          order.order_number,
        results,
      });
    } catch (error) {
      console.error(
        "[send-order-sms]",
        error,
      );

      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500,
      );
    }
  },
);

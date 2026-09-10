import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

let secretKeys: Record<string, string> = {};

try {
  secretKeys = secretKeysRaw
    ? (JSON.parse(secretKeysRaw) as Record<string, string>)
    : {};
} catch {
  throw new Error("Invalid SUPABASE_SECRET_KEYS configuration.");
}

const supabaseSecretKey =
  secretKeys.default ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseSecretKey) {
  throw new Error("Supabase secret key is not configured.");
}

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ||
  "mailto:admin@shehara.ye";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("Web Push VAPID keys are not configured.");
}

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

type PushPayload = {
  notification_id?: string;
  user_id?: string;
  title?: string;
  body?: string;
  link_url?: string;
  kind?: string;
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

function getProvidedSecret(request: Request): string {
  const apikey = request.headers.get("apikey");

  if (apikey) {
    return apikey.trim();
  }

  const authorization =
    request.headers.get("Authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization
      .slice("Bearer ".length)
      .trim();
  }

  return "";
}

function safeEqual(
  a: string,
  b: string,
): boolean {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < a.length; index++) {
    result |=
      a.charCodeAt(index) ^
      b.charCodeAt(index);
  }

  return result === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  /*
   * The function is intentionally configured with
   * verify_jwt = false because it is invoked server-to-server
   * by the database webhook.
   *
   * Therefore we MUST validate the Supabase secret manually.
   */
  const providedSecret =
    getProvidedSecret(request);

  if (
    !providedSecret ||
    !safeEqual(
      providedSecret,
      supabaseSecretKey,
    )
  ) {
    return json(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  try {
    const payload =
      (await request.json()) as PushPayload;

    if (!payload.user_id) {
      return json(
        {
          error: "user_id is required",
        },
        400,
      );
    }

    const title =
      payload.title ||
      "إشعار جديد من شهارة";

    const body =
      payload.body ||
      "لديك إشعار جديد.";

    const linkUrl =
      payload.link_url ||
      "/admin/orders";

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabaseAdmin
      .from("user_push_subscriptions")
      .select("id,subscription")
      .eq("user_id", payload.user_id)
      .eq("is_active", true);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    if (
      !subscriptions ||
      subscriptions.length === 0
    ) {
      return json({
        ok: true,
        sent: 0,
        removed: 0,
        total: 0,
        message:
          "No active push subscriptions.",
      });
    }

    const pushPayload =
      JSON.stringify({
        title,
        body,
        link_url: linkUrl,
        tag:
          payload.notification_id
            ? `notification-${payload.notification_id}`
            : `shehara-${Date.now()}`,
        kind:
          payload.kind ||
          "notification",
      });

    let sent = 0;
    let removed = 0;

    for (
      const subscriptionRow of subscriptions
    ) {
      try {
        await webpush.sendNotification(
          subscriptionRow.subscription,
          pushPayload,
          {
            TTL: 60 * 60,
            urgency: "high",
          },
        );

        sent++;
      } catch (error) {
        const statusCode =
          (
            error as {
              statusCode?: number;
            }
          )?.statusCode;

        /*
         * 404 / 410 means the browser push endpoint
         * is no longer valid.
         */
        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          const {
            error: deactivateError,
          } = await supabaseAdmin
            .from(
              "user_push_subscriptions",
            )
            .update({
              is_active: false,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              subscriptionRow.id,
            );

          if (deactivateError) {
            console.error(
              "Failed to deactivate expired subscription:",
              deactivateError,
            );
          }

          removed++;
        } else {
          console.error(
            "Push delivery failed:",
            error,
          );
        }
      }
    }

    return json({
      ok: true,
      sent,
      removed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error(
      "send-web-push error:",
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500,
    );
  }
});

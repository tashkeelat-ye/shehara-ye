import webpush from "npm:web-push@3.6.7";

import { createClient } from "npm:@supabase/supabase-js@2";


const supabaseUrl =
  Deno.env.get("SUPABASE_URL")!;

const secretKeysRaw =
  Deno.env.get(
    "SUPABASE_SECRET_KEYS",
  );

const secretKeys =
  secretKeysRaw
    ? JSON.parse(secretKeysRaw)
    : {};

const supabaseSecretKey =
  secretKeys.default ||
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

if (!supabaseSecretKey) {
  throw new Error(
    "Supabase secret key is not configured.",
  );
}


const VAPID_PUBLIC_KEY =
  Deno.env.get(
    "VAPID_PUBLIC_KEY",
  )!;

const VAPID_PRIVATE_KEY =
  Deno.env.get(
    "VAPID_PRIVATE_KEY",
  )!;

const VAPID_SUBJECT =
  Deno.env.get(
    "VAPID_SUBJECT",
  ) ||
  "mailto:admin@shehara.ye";


webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);


const supabaseAdmin =
  createClient(
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
      },
    },
  );
}


Deno.serve(async (request) => {
  if (
    request.method !== "POST"
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
      (await request.json()) as PushPayload;


    if (
      !payload.user_id
    ) {
      return json(
        {
          error:
            "user_id is required",
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
      error:
        subscriptionsError,
    } =
      await supabaseAdmin
        .from(
          "user_push_subscriptions",
        )
        .select(
          "id,subscription",
        )
        .eq(
          "user_id",
          payload.user_id,
        )
        .eq(
          "is_active",
          true,
        );


    if (
      subscriptionsError
    ) {
      throw subscriptionsError;
    }


    if (
      !subscriptions ||
      subscriptions.length === 0
    ) {
      return json({
        ok: true,
        sent: 0,
        message:
          "No active push subscriptions.",
      });
    }


    const pushPayload =
      JSON.stringify({
        title,
        body,
        link_url:
          linkUrl,
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
      } catch (
        error
      ) {
        const statusCode =
          (
            error as {
              statusCode?: number;
            }
          )?.statusCode;


        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await supabaseAdmin
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
      total:
        subscriptions.length,
    });
  } catch (
    error
  ) {
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

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl =
  Deno.env.get("SUPABASE_URL")!;

const serviceRoleKey =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not configured.",
  );
}

const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

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
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function getBearerToken(
  request: Request,
): string {
  const authorization =
    request.headers.get(
      "Authorization",
    );

  if (
    authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  return "";
}

function getClientIp(
  request: Request,
): string | null {
  const candidates = [
    request.headers.get(
      "x-forwarded-for",
    ),
    request.headers.get(
      "x-real-ip",
    ),
    request.headers.get(
      "cf-connecting-ip",
    ),
  ];

  for (
    const candidate of candidates
  ) {
    if (!candidate) {
      continue;
    }

    const first =
      candidate
        .split(",")[0]
        ?.trim();

    if (first) {
      return first;
    }
  }

  return null;
}

function getHeader(
  request: Request,
  names: string[],
): string | null {
  for (
    const name of names
  ) {
    const value =
      request.headers.get(name);

    if (
      value &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
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
      const token =
        getBearerToken(
          request,
        );

      if (!token) {
        return json(
          {
            error:
              "Unauthorized",
          },
          401,
        );
      }

      const {
        data: userData,
        error: userError,
      } =
        await supabaseAdmin.auth.getUser(
          token,
        );

      if (
        userError ||
        !userData.user
      ) {
        return json(
          {
            error:
              "Invalid session",
          },
          401,
        );
      }

      const userId =
        userData.user.id;

      const body =
        (await request.json()) as {
          device_type?: string;
          os_name?: string;
          browser_name?: string;
          user_agent?: string;
          latitude?: number | null;
          longitude?: number | null;
          accuracy?: number | null;
          path?: string;
        };

      const ip =
        getClientIp(
          request,
        );

      const country =
        getHeader(
          request,
          [
            "cf-ipcountry",
            "x-vercel-ip-country",
          ],
        );

      const region =
        getHeader(
          request,
          [
            "x-vercel-ip-country-region",
          ],
        );

      const city =
        getHeader(
          request,
          [
            "x-vercel-ip-city",
          ],
        );

      const {
        data,
        error,
      } =
        await supabaseAdmin.rpc(
          "record_user_activity",
          {
            p_user_id:
              userId,

            p_ip:
              ip,

            p_country:
              country,

            p_region:
              region,

            p_city:
              city,

            p_device_type:
              body.device_type ??
              null,

            p_os_name:
              body.os_name ??
              null,

            p_browser_name:
              body.browser_name ??
              null,

            p_user_agent:
              body.user_agent ??
              request.headers.get(
                "user-agent",
              ),

            p_latitude:
              typeof body.latitude ===
              "number"
                ? body.latitude
                : null,

            p_longitude:
              typeof body.longitude ===
              "number"
                ? body.longitude
                : null,

            p_accuracy:
              typeof body.accuracy ===
              "number"
                ? body.accuracy
                : null,

            p_path:
              body.path ??
              "/",
          },
        );

      if (error) {
        console.error(
          "record_user_activity failed:",
          error,
        );

        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }

      return json({
        ok: true,
        activity: data,
      });
    } catch (error) {
      console.error(
        "track-user-activity error:",
        error,
      );

      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        },
        500,
      );
    }
  },
);

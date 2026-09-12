const ALLOWED_ORIGINS = [
  "https://406140a9.map-rain-forecast.pages.dev",
  "https://capable-bombolone-bb9e3f.netlify.app",
  "https://dashing-kitten-8af996.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(
  data: unknown,
  status = 200,
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...getCorsHeaders(origin),
    },
  });
}

function safeString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function safeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function safeInteger(value: unknown): number | null {
  const number = safeNumber(value);

  if (number === null) {
    return null;
  }

  return Number.isInteger(number) ? number : Math.round(number);
}

function safeJson(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    // ------------------------------------------------------
    // GET /api/ai-log/health
    // ------------------------------------------------------

    if (
      request.method === "GET" &&
      url.pathname === "/api/ai-log/health"
    ) {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS ok")
          .first();

        return jsonResponse(
          {
            success: true,
            database: result?.ok === 1,
            service: "rain-ai-worker",
          },
          200,
          origin,
        );
      } catch (error) {
        console.error("Health check failed:", error);

        return jsonResponse(
          {
            success: false,
            database: false,
            service: "rain-ai-worker",
          },
          500,
          origin,
        );
      }
    }

    // ------------------------------------------------------
    // POST /api/ai-log
    // ------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/api/ai-log"
    ) {
      try {
        const body = await request.json();

        if (!body || typeof body !== "object") {
          return jsonResponse(
            {
              success: false,
              error: "Invalid JSON body",
            },
            400,
            origin,
          );
        }

        const data = body as Record<string, unknown>;

        const question = safeString(data.question);

        if (!question) {
          return jsonResponse(
            {
              success: false,
              error: "question is required",
            },
            400,
            origin,
          );
        }

        const result = await env.DB
          .prepare(`
            INSERT INTO ai_logs (
              session_id,
              message_id,
              question,
              intent,
              data_source,
              selected_province,
              selected_station,
              station_id,
              latitude,
              longitude,
              hours,
              radius_km,
              threshold_mm,
              observed_summary,
              forecast_summary,
              answer,
              success,
              error_message,
              client,
              app_version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            safeString(data.session_id),
            safeString(data.message_id),
            question,
            safeString(data.intent),
            safeString(data.data_source),
            safeString(data.selected_province),
            safeString(data.selected_station),
            safeString(data.station_id),
            safeNumber(data.latitude),
            safeNumber(data.longitude),
            safeInteger(data.hours),
            safeNumber(data.radius_km),
            safeNumber(data.threshold_mm),
            safeJson(data.observed_summary),
            safeJson(data.forecast_summary),
            safeString(data.answer),
            data.success === false ? 0 : 1,
            safeString(data.error_message),
            safeString(data.client),
            safeString(data.app_version),
          )
          .run();

        return jsonResponse(
          {
            success: true,
            id: result.meta.last_row_id,
          },
          201,
          origin,
        );
      } catch (error) {
        console.error("AI log insert failed:", error);

        return jsonResponse(
          {
            success: false,
            error: "Failed to save AI log",
          },
          500,
          origin,
        );
      }
    }

    // ------------------------------------------------------
    // Method / route handling
    // ------------------------------------------------------

    if (
      url.pathname === "/api/ai-log" ||
      url.pathname === "/api/ai-log/health"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed",
        },
        405,
        origin,
      );
    }

    return jsonResponse(
      {
        success: false,
        error: "Not found",
      },
      404,
      origin,
    );
  },
} satisfies ExportedHandler<Env>;

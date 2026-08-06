import { createFileRoute } from "@tanstack/react-router";

type ChatBody = {
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: string;
};

const SYSTEM = `أنت "مساعد تشكيلات" الذكي داخل تطبيق متجر "تشكيلات للتسوق" اليمني.
- أجب بالعربية الفصحى المبسطة وبإيجاز (٣ أسطر كحد أقصى غالبًا).
- ساعد المستخدم في العثور على المنتجات، الأسعار، طرق الدفع (الدفع عند الاستلام، المحفظة، التحويل البنكي/المحافظ الإلكترونية)، التوصيل، الاستبدال والإرجاع، وحالة الطلبات.
- إن احتاج المستخدم تدخلًا بشريًا اطلب منه فتح تبويب "خدمة العملاء" داخل نفس النافذة.
- لا تختلق منتجات أو أسعارًا غير موجودة في السياق المرفق.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "no_messages" }), { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "missing_key" }), { status: 500 });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM + (body.context ? `\n\nمنتجات متاحة:\n${body.context}` : "") },
              ...messages,
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          return new Response(JSON.stringify({ error: "gateway", status: res.status, detail }), {
            status: res.status === 429 || res.status === 402 ? res.status : 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = data.choices?.[0]?.message?.content ?? "";
        return new Response(JSON.stringify({ reply }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

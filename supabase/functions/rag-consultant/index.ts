import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { task_title, task_description, question } = await req.json();
    if (!task_description || !question) {
      return new Response(JSON.stringify({ error: "Missing task_description or question" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const systemPrompt = `Ты — бот-консультант по волонтёрской задаче на платформе Sunbeam Connect.

ЗАДАЧА: "${task_title}"
ОПИСАНИЕ: "${task_description}"

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе информации из описания задачи выше
2. Если информации нет в описании — отвечай ТОЧНО: "Организатор этого не указал. Рекомендую связаться с организацией для уточнения."
3. НЕ придумывай, НЕ додумывай, НЕ фантазируй
4. НЕ ссылайся на внешние источники
5. Будь кратким и полезным
6. Отвечай на русском языке`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Слишком много запросов" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Требуется пополнение" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Не удалось получить ответ";
    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("rag-consultant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

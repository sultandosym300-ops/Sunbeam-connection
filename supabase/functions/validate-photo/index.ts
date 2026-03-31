import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, task_title, task_description } = await req.json();
    if (!image_base64 || !task_description) {
      return new Response(JSON.stringify({ error: "Missing image or task description" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const prompt = `Ты — система валидации фото-отчётов волонтёров на платформе Sunbeam Connect.

ЗАДАЧА: "${task_title}"
ОПИСАНИЕ: "${task_description}"

Проанализируй загруженное фото и определи:
1. Соответствует ли фото описанию задачи? (видна ли релевантная деятельность)
2. Видна ли выполненная работа на фото?
3. Есть ли признаки фальсификации (стоковое фото, скриншот, нерелевантное изображение)?

Вынеси вердикт используя функцию submit_verdict.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
          ],
        }],
        tools: [{
          type: "function",
          function: {
            name: "submit_verdict",
            description: "Вынести вердикт по фото-отчёту",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["approved", "rejected"], description: "Вердикт" },
                comment: { type: "string", description: "Комментарий с объяснением решения на русском" },
                confidence: { type: "number", description: "Уверенность 0-100" },
              },
              required: ["verdict", "comment", "confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_verdict" } },
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ verdict: "rejected", comment: "Не удалось проанализировать фото", confidence: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("validate-photo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const systemPrompt = `Ты — дружелюбный AI-ассистент платформы Sunbeam Connect в Казахстане.
Твоя задача — провести короткое интервью с волонтёром, чтобы узнать его навыки, опыт и интересы.

Правила:
- Задавай по 1-2 вопроса за раз
- Будь тёплым и мотивирующим
- ОБЯЗАТЕЛЬНО спроси: возраст, опыт волонтёрства/работы и основные навыки
- Спроси о профессии, хобби, опыте волонтёрства, что нравится делать
- Уточни доступное время (дни недели, утро/день/вечер)
- Когда собрал достаточно информации (возраст, опыт, навыки, доступность), вызови функцию save_profile
- Навыки выбирай ТОЛЬКО из списка: Медицина, ИТ, Образование, Животные, Дети, Экология, Спорт, Кулинария, Транспорт, Строительство, Психология, Юриспруденция, Дизайн, Маркетинг, Переводы
- Bio должно быть кратким описанием (2-3 предложения) на основе ответов
- Experience — краткое описание опыта работы/волонтёрства
- Availability — объект где ключи это дни (Пн, Вт, Ср, Чт, Пт, Сб, Вс), значения — массивы из ["Утро", "День", "Вечер"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: [{
          type: "function",
          function: {
            name: "save_profile",
            description: "Сохранить профиль волонтёра после интервью",
            parameters: {
              type: "object",
              properties: {
                skills: { type: "array", items: { type: "string" }, description: "Навыки из списка" },
                bio: { type: "string", description: "Краткое описание волонтёра" },
                age: { type: "integer", description: "Возраст волонтёра" },
                experience: { type: "string", description: "Опыт работы/волонтёрства" },
                availability: {
                  type: "object",
                  description: "Доступность по дням недели",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string", enum: ["Утро", "День", "Вечер"] }
                  },
                },
              },
              required: ["skills", "bio", "age", "experience", "availability"],
              additionalProperties: false,
            },
          },
        }],
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Слишком много запросов" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Требуется пополнение баланса" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", s, t);
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("profile-interviewer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

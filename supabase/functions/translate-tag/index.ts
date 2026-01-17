import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationRequest {
  tag: string;
  targetLanguages: string[];
}

interface TranslationResponse {
  translations: {
    fr: string;
    en: string;
    ar: string;
    es: string;
    de: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tag, targetLanguages = ["en", "ar", "es", "de"] }: TranslationRequest = await req.json();

    if (!tag) {
      return new Response(
        JSON.stringify({ error: "Tag is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Translate the following French tag/keyword for a blog about artisanal straw products (hats, bags) from Morocco:

French tag: "${tag}"

Provide translations to these languages:
- English (en)
- Arabic (ar) - use Modern Standard Arabic
- Spanish (es)
- German (de)

Important:
- Keep translations concise (1-3 words max)
- Use vocabulary appropriate for fashion/crafts context
- For Arabic, use right-to-left text

Respond ONLY with a JSON object in this exact format (no markdown, no code blocks):
{"en": "English translation", "ar": "Arabic translation", "es": "Spanish translation", "de": "German translation"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional translator specializing in fashion and artisanal crafts vocabulary. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "Translation service error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No translation received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from the AI
    let translations;
    try {
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      translations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse translation", 
          rawContent: content 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add the original French tag
    const result: TranslationResponse = {
      translations: {
        fr: tag,
        en: translations.en || tag,
        ar: translations.ar || "",
        es: translations.es || tag,
        de: translations.de || tag,
      }
    };

    console.log(`Translated tag "${tag}":`, result.translations);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in translate-tag function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

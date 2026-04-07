import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a receipt data extraction assistant for Australian businesses. Extract structured data from receipt images. Use Australian date format (YYYY-MM-DD for the output). Amounts should be numbers without currency symbols. If GST is shown separately, extract it; otherwise estimate GST as amount/11 (Australian GST is 10%). For category, pick the most appropriate from: Advertising, Bank Fees, Car Expenses, Cleaning, Clothing, Computer & IT, Depreciation, Education & Training, Electricity & Gas, Entertainment, Equipment & Tools, Food & Drink, Freight & Courier, Gifts, Insurance, Interest, Legal Fees, Memberships, Motor Vehicle, Office Supplies, Phone & Internet, Postage, Printing, Professional Fees, Rent, Repairs & Maintenance, Software & Subscriptions, Stationery, Subcontractors, Superannuation, Tax Agent Fees, Travel, Utilities, Wages, Other.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the receipt details from this image. Return the data using the extract_receipt_data function.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description: "Extract structured data from a receipt image",
              parameters: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    description: "Date of the receipt in YYYY-MM-DD format",
                  },
                  supplier: {
                    type: "string",
                    description: "Name of the business/supplier on the receipt",
                  },
                  amount: {
                    type: "number",
                    description: "Total amount including GST",
                  },
                  gst: {
                    type: "number",
                    description: "GST amount (if shown, otherwise amount/11)",
                  },
                  category: {
                    type: "string",
                    description: "Best matching expense category",
                  },
                  description: {
                    type: "string",
                    description: "Brief description of what was purchased",
                  },
                },
                required: ["date", "supplier", "amount", "gst", "category", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

// Çalışan kodundaki modeli ve URL yapısını koruyoruz
const GEMINI_MODEL = 'gemini-1.5-flash'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

serve(async (req) => {
  // CORS preflight isteği
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { words } = await req.json(); // Frontend'den gelen kelime listesi
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    // Quiz için özel prompt oluşturuyoruz
    const promptDetails = `
      Based on these English words and their Turkish meanings: ${JSON.stringify(words)}.
      Create a 5-question multiple choice quiz to test the user's knowledge.
      IMPORTANT: Your response must be ONLY a valid JSON object.
      Do not include markdown like \`\`\`json.
      
      Format:
      {
        "quiz": [
          {
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0
          }
        ]
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: promptDetails
        }]
      }],
      // Çalışan kodundaki güvenlik ayarlarını aynen buraya da ekledik
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        response_mime_type: "application/json" // Saf JSON garantisi
      }
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error.message);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_MODEL = 'gemini-1.5-flash'; // Sohbet için bu model daha uygun
const GEMINI_API_URL = `https://generativelace.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // message: yeni mesaj, history: önceki konuşmalar
    const { message, history } = await req.json();
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY bulunamadı!");
    }

    // AI'a rolünü ve görevi anlatan bir sistem prompt'u hazırlıyoruz
    const systemPrompt = `You are a friendly and helpful AI assistant for an English language learner. 
    Your name is 'LearnEnglish AI'. Keep your answers encouraging, clear, and relatively simple. 
    If the user asks a complex question, try to explain it in a way a B1/B2 level English learner can understand.`;

    // Gemini API'sinin beklediği formatta geçmişi ve yeni mesajı birleştir
    const contents = [
      // Önceki konuşma geçmişi
      ...history, 
      // Kullanıcının yeni mesajı
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const requestBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || data.candidates.length === 0) {
      console.error("Gemini Hatası:", data);
      throw new Error(data.error?.message || "Gemini API'den geçerli bir cevap alınamadı.");
    }
    
    // AI'ın ürettiği cevabı alıyoruz
    const aiResponseText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply: aiResponseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Fonksiyon Hatası:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
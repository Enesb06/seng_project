// supabase/functions/synthesize-text/index.ts (YENİ - UZUN METİNLER İÇİN)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GCLOUD_API_KEY = Deno.env.get('GEMINI_API_KEY'); 
const GCLOUD_TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCLOUD_API_KEY}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GCLOUD_API_KEY) {
      throw new Error("API anahtarı (GEMINI_API_KEY) bulunamadı.");
    }
    
    const { text } = await req.json();

    if (!text) {
      throw new Error('"text" parametresi gerekli.');
    }

    const requestBody = {
      input: { text: text },
      voice: { languageCode: 'en-US', name: 'en-US-Journey-D' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const response = await fetch(GCLOUD_TTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Cloud TTS Hatası:", errorData.error.message);
        throw new Error(errorData.error.message || 'Google Cloud TTS servisinden ses alınamadı.');
    }
    
    const responseData = await response.json();
    const audioContent = atob(responseData.audioContent);
    const audioBytes = new Uint8Array(audioContent.length);
    for (let i = 0; i < audioContent.length; i++) {
      audioBytes[i] = audioContent.charCodeAt(i);
    }
    
    return new Response(audioBytes, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    console.error("Catch bloğuna düşüldü. Hata:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
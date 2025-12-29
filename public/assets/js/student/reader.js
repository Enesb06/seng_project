// assets/js/student/reader.js
import { _supabase } from '../supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const materialsList = document.getElementById('materials-list');
const readingTitle = document.getElementById('reading-title');
const readingBody = document.getElementById('reading-body');
const newMaterialBtn = document.getElementById('new-material-btn');
const preferencesModal = document.getElementById('preferences-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const preferencesForm = document.getElementById('preferences-form');
const loader = document.getElementById('loader');

// --- GÜVENLİ API BİLGİSİ ---
const AI_FUNCTION_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material'; 

// --- KULLANICI BİLGİLERİNİ ALMA ---
const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- KULLANICININ MATERYALLERİNİ YÜKLE ---
const loadUserMaterials = async () => {
    const user = getUser();
    if (!user) return;

    materialsList.innerHTML = '';
    const { data, error } = await _supabase
        .from('contents')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Materyaller yüklenemedi:", error);
        materialsList.innerHTML = '<p>Materyaller yüklenirken bir hata oluştu.</p>';
        return;
    }

    if (data.length === 0) {
        materialsList.innerHTML = '<p>Henüz hiç materyal oluşturmadın.</p>';
    } else {
        data.forEach(material => {
            const item = document.createElement('div');
            item.className = 'material-item';
            item.textContent = material.title;
            item.dataset.id = material.id;
            materialsList.appendChild(item);
        });
    }
};

// --- SEÇİLEN MATERYALİ GÖSTER ---
const displayMaterial = async (contentId) => {
    document.querySelectorAll('.material-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector(`.material-item[data-id='${contentId}']`);
    if(activeItem) activeItem.classList.add('active');

    readingTitle.textContent = 'Yükleniyor...';
    readingBody.textContent = '';

    const { data, error } = await _supabase
        .from('contents')
        .select('title, body')
        .eq('id', contentId)
        .single();

    if (error || !data) {
        readingTitle.textContent = 'Hata';
        readingBody.textContent = 'İçerik yüklenemedi.';
        return;
    }

    readingTitle.textContent = data.title;
    readingBody.textContent = data.body;
};

// --- YARDIMCI FONKSİYON: JSON TEMİZLEME ---
// Gemini bazen yanıtı ```json { ... } ``` blokları içinde verir, bu fonksiyon onu ayıklar.
const parseGeminiJSON = (text) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Hatası. Gelen Metin:", text);
        throw new Error("AI yanıtı geçerli bir JSON formatında değil.");
    }
};

// --- YENİ MATERYAL OLUŞTURMA SÜRECİ ---
const handleGenerateNewMaterial = async (e) => {
    e.preventDefault();
    const user = getUser();
    if (!user) return;

    // Arayüz hazırlığı
    readingTitle.classList.add('hidden');
    readingBody.classList.add('hidden');
    loader.classList.remove('hidden');
    preferencesModal.classList.add('hidden');

    const category = document.getElementById('interest-category').value;
    const difficulty = document.getElementById('difficulty-level').value;
    const length = document.getElementById('content-length').value;

    const promptDetails = `Write a ${length} reading text in English for an ${difficulty} level student about ${category}. The text should be engaging and educational. IMPORTANT: Your response must be ONLY a valid JSON object with a "title" field and a "body" field. Do not include any other text, explanations, or markdown formatting like \`\`\`json.`;
    
    try {
        const response = await fetch(AI_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptDetails })
        });
        
        // Yanıtın JSON olup olmadığını kontrol ederek parse et (Unexpected end of JSON hatasını önlemek için)
        const textResponse = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(textResponse);
        } catch (parseErr) {
            console.error("Sunucu yanıtı JSON değil:", textResponse);
            throw new Error("Sunucudan geçersiz bir yanıt alındı (400/500 Hatası olabilir).");
        }

        if (!response.ok) {
            throw new Error(responseData.error || `Sunucu hatası: ${response.status}`);
        }
        
        // Gemini API hiyerarşisini kontrol et
        if (!responseData.candidates || !responseData.candidates[0].content?.parts[0]?.text) {
            console.error("API Yanıt Yapısı Bozuk:", responseData);
            throw new Error("AI'den beklenen içerik formatı alınamadı.");
        }

        const rawText = responseData.candidates[0].content.parts[0].text;
        const contentData = parseGeminiJSON(rawText);

        // Supabase'e kaydet
        const { data: newContent, error: dbError } = await _supabase
            .from('contents')
            .insert({
                title: contentData.title,
                body: contentData.body,
                user_id: user.id,
                interest_category: category,
                difficulty_level: difficulty,
            }).select('id').single();

        if (dbError) throw dbError;

        // UI Güncelle
        await loadUserMaterials();
        displayMaterial(newContent.id);

    } catch (error) {
        console.error("Materyal oluşturma hatası:", error);
        readingTitle.textContent = 'Hata';
        readingBody.textContent = `Hata oluştu: ${error.message}. Lütfen Edge Function loglarını ve API anahtarınızı kontrol edin.`;
    } finally {
        loader.classList.add('hidden');
        readingTitle.classList.remove('hidden');
        readingBody.classList.remove('hidden');
        preferencesForm.reset();
    }
};

// --- SAYFA KURULUMU VE OLAY DİNLEYİCİLER ---
const initializePage = () => {
    const user = getUser();
    if (user) {
        welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    }

    loadUserMaterials();

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
    newMaterialBtn.addEventListener('click', () => preferencesModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => preferencesModal.classList.add('hidden'));
    preferencesModal.addEventListener('click', (e) => {
        if (e.target === preferencesModal) preferencesModal.classList.add('hidden');
    });
    materialsList.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('material-item')) {
            const id = e.target.dataset.id;
            displayMaterial(id);
        }
    });
    preferencesForm.addEventListener('submit', handleGenerateNewMaterial);
};

document.addEventListener('DOMContentLoaded', initializePage);
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

// --- API BİLGİLERİ (OPENROUTER İÇİN AYARLANDI) ---
const AI_API_URL = 'https://openrouter.ai/api/v1/chat/completions'; 
const AI_API_KEY = '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'; // Lütfen kendi anahtarınızın burada olduğundan emin olun

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

// --- YENİ MATERYAL OLUŞTURMA SÜRECİ (MODEL ADI GÜNCELLENDİ) ---
const handleGenerateNewMaterial = async (e) => {
    e.preventDefault();
    const user = getUser();
    if (!user) return;

    readingTitle.classList.add('hidden');
    readingBody.classList.add('hidden');
    loader.classList.remove('hidden');
    preferencesModal.classList.add('hidden');

    const category = document.getElementById('interest-category').value;
    const difficulty = document.getElementById('difficulty-level').value;
    const length = document.getElementById('content-length').value;

    const requestBody = {
        // --- EN ÖNEMLİ DEĞİŞİKLİK BURADA ---
        model: "mistralai/mistral-7b-instruct:free", // İSTEDİĞİNİZ YENİ MODEL
        // ------------------------------------
        messages: [
            {
                role: "user",
                content: `Write a ${length} reading text in English for an ${difficulty} level student about ${category}. The text should be engaging and educational. IMPORTANT: Your response must be ONLY a valid JSON object with a "title" field and a "body" field. Do not include any other text, explanations, or markdown formatting like \`\`\`json.`
            }
        ],
        response_format: { "type": "json_object" }
    };

    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'LearnEnglish.com'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error('AI API Hatası: ' + (errorData.error?.message || response.statusText));
        }
        
        const responseData = await response.json();
        
        if (!responseData.choices || !responseData.choices[0].message.content) {
            console.error("Beklenmedik API yanıt formatı:", responseData);
            throw new Error("API'den geçerli bir formatta yanıt alınamadı.");
        }

        const contentText = responseData.choices[0].message.content;
        const contentData = JSON.parse(contentText);

        const { data: newContent, error } = await _supabase
            .from('contents')
            .insert({
                title: contentData.title,
                body: contentData.body,
                user_id: user.id,
                interest_category: category,
                difficulty_level: difficulty,
            }).select('id').single();

        if (error) throw error;

        await loadUserMaterials();
        displayMaterial(newContent.id);

    } catch (error) {
        console.error("Materyal oluşturma hatası:", error);
        readingTitle.textContent = 'Hata';
        readingBody.textContent = 'Materyal oluşturulurken bir sorun yaşandı. Detaylar için F12 ile konsolu kontrol edin.';
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
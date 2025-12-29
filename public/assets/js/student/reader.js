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

// Tooltip (Çeviri Kutusu) Elemanları
const tooltip = document.getElementById('translation-tooltip');
const tooltipWord = document.getElementById('tooltip-word');
const tooltipMeaning = document.getElementById('tooltip-meaning');
const addWordBtn = document.getElementById('add-to-wordlist-btn');

const AI_FUNCTION_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material'; 

const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- KELİMELERİ TIKLANABİLİR YAPMA ---
const wrapWords = (text) => {
    return text.split(/(\s+)/).map(part => {
        if (/\w+/.test(part)) {
            const cleanWord = part.replace(/[.,!?;:()]/g, '');
            const punctuation = part.replace(cleanWord, '');
            return `<span class="word" data-word="${cleanWord}">${cleanWord}</span>${punctuation}`;
        }
        return part;
    }).join('');
};

// --- MYMEMORY API İLE ÇEVİRİ ---
const getTranslation = async (word) => {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|tr`);
        const data = await res.json();
        return data.responseData.translatedText || "Çeviri bulunamadı";
    } catch (err) {
        return "Bağlantı hatası";
    }
};

// --- MATERYALİ EKRANA BAS ---
const displayMaterial = async (contentId) => {
    document.querySelectorAll('.material-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector(`.material-item[data-id='${contentId}']`);
    if(activeItem) activeItem.classList.add('active');

    readingTitle.textContent = 'Yükleniyor...';
    readingBody.innerHTML = '';

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
    readingBody.innerHTML = wrapWords(data.body);
};

// --- KELİME TIKLAMA VE TOOLTIP KONUMLANDIRMA ---
readingBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('word')) {
        const word = e.target.getAttribute('data-word');
        const rect = e.target.getBoundingClientRect();

        // Tooltip'i kelimenin tam üstünde göster
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 80}px`;
        tooltip.style.display = 'flex';

        tooltipWord.textContent = word;
        tooltipMeaning.textContent = "Çevriliyor...";
        
        const meaning = await getTranslation(word);
        tooltipMeaning.textContent = meaning;
        
        // Kaydet butonuna basınca olacaklar
        addWordBtn.onclick = () => saveToWordlist(word, meaning);
    } else {
        tooltip.style.display = 'none';
    }
});

// Boşluğa tıklayınca kapat
document.addEventListener('mousedown', (e) => {
    if (tooltip && !tooltip.contains(e.target) && !e.target.classList.contains('word')) {
        tooltip.style.display = 'none';
    }
});

// --- VERİTABANINA KAYDETME (SENİN TABLO YAPINA GÖRE) ---
const saveToWordlist = async (word, meaning) => {
    const user = getUser();
    if (!user) return;

    addWordBtn.disabled = true;
    addWordBtn.textContent = "Kaydediliyor...";

    const { error } = await _supabase
        .from('word_list') // <-- EĞER TABLO ADIN FARKLIYSA BURAYI DEĞİŞTİR
        .insert({
            student_id: user.id,      // Görseldeki sütun: student_id
            word: word,               // Görseldeki sütun: word
            definition: meaning,      // Görseldeki sütun: definition
            learning_status: 'learning' // Görseldeki sütun: learning_status
        });

    if (error) {
        console.error("Kaydetme hatası:", error);
        alert("Hata: " + error.message);
    } else {
        alert("Kelime listene eklendi!");
        tooltip.style.display = 'none';
    }
    addWordBtn.disabled = false;
    addWordBtn.textContent = "Kelime Listeme Ekle";
};

// --- YENİ MATERYAL OLUŞTURMA (AI) ---
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

    const promptDetails = `Write a ${length} reading text in English for an ${difficulty} level student about ${category}. IMPORTANT: Response must be ONLY a valid JSON object with "title" and "body" fields.`;
    
    try {
        const response = await fetch(AI_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptDetails })
        });
        
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'API Hatası');

        const rawText = responseData.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const contentData = JSON.parse(cleanedText);

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

        await loadUserMaterials();
        displayMaterial(newContent.id);

    } catch (error) {
        console.error(error);
        readingTitle.textContent = 'Hata';
        readingBody.textContent = 'Bir sorun oluştu: ' + error.message;
    } finally {
        loader.classList.add('hidden');
        readingTitle.classList.remove('hidden');
        readingBody.classList.remove('hidden');
        preferencesForm.reset();
    }
};

// --- MATERYAL LİSTESİNİ YÜKLE ---
const loadUserMaterials = async () => {
    const user = getUser();
    if (!user) return;

    materialsList.innerHTML = '';
    const { data, error } = await _supabase
        .from('contents')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (data) {
        data.forEach(material => {
            const item = document.createElement('div');
            item.className = 'material-item';
            item.textContent = material.title;
            item.dataset.id = material.id;
            materialsList.appendChild(item);
        });
    }
};

// --- SAYFA BAŞLATMA ---
const initializePage = () => {
    const user = getUser();
    if (user) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    loadUserMaterials();
    
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
    newMaterialBtn.addEventListener('click', () => preferencesModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => preferencesModal.classList.add('hidden'));
    materialsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('material-item')) displayMaterial(e.target.dataset.id);
    });
    preferencesForm.addEventListener('submit', handleGenerateNewMaterial);
};

document.addEventListener('DOMContentLoaded', initializePage);
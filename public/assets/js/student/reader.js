import { _supabase } from '../supabaseClient.js';

// --- DEĞİŞKENLER VE SEÇİCİLER ---
let currentEssayId = null;
const getUser = () => JSON.parse(localStorage.getItem('user'));

const readingTitle = document.getElementById('reading-title');
const readingBody = document.getElementById('reading-body');
const materialsList = document.getElementById('materials-list');
const noteTextarea = document.getElementById('note-textarea');
const historyContainer = document.getElementById('note-history-list');

const tooltip = document.getElementById('translation-tooltip');
const tooltipWord = document.getElementById('tooltip-word');
const tooltipMeaning = document.getElementById('tooltip-meaning');
const addWordBtn = document.getElementById('add-to-wordlist-btn');

const preferencesModal = document.getElementById('preferences-modal');
const preferencesForm = document.getElementById('preferences-form');
const loader = document.getElementById('loader');

const AI_FUNCTION_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material';

// --- 1. KELİME ÇEVİRİ MANTIĞI (WRAPPER & API) ---

const wrapWords = (text) => {
    if (!text) return '';
    return text.split(/(\s+)/).map(part => {
        if (/\w+/.test(part)) {
            const cleanWord = part.replace(/[.,!?;:()]/g, '');
            const punctuation = part.replace(cleanWord, '');
            return `<span class="word" data-word="${cleanWord}">${cleanWord}</span>${punctuation}`;
        }
        return part;
    }).join('');
};

const getTranslation = async (word) => {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|tr`);
        const data = await res.json();
        return data.responseData.translatedText || "Çeviri bulunamadı";
    } catch (err) { return "Bağlantı hatası"; }
};

// --- 2. MATERYAL GÖRÜNTÜLEME VE NOT YÜKLEME ---

const displayMaterial = async (contentId) => {
    try {
        currentEssayId = contentId;
        const user = getUser();

        // Aktif materyali işaretle
        document.querySelectorAll('.material-item').forEach(el => el.classList.remove('active'));
        const selected = document.querySelector(`[data-id='${contentId}']`);
        if (selected) selected.classList.add('active');

        const { data, error } = await _supabase.from('contents').select('*').eq('id', contentId).single();
        if (error) throw error;

        readingTitle.textContent = data.title;
        readingBody.innerHTML = wrapWords(data.body); // Çeviri için kelimelere böl

        // BU YAZIYA ÖZEL NOTU GETİR
        const savedNote = localStorage.getItem(`note_${user.id}_${contentId}`);
        noteTextarea.value = savedNote || "";

    } catch (err) { console.error("Hata:", err); }
};

// --- 3. NOT KAYDETME VE GEÇMİŞ LİSTESİ ---

const saveCurrentNote = () => {
    if (!currentEssayId) return alert("Önce bir yazı seçin!");
    const user = getUser();
    const noteText = noteTextarea.value;
    const title = readingTitle.textContent;

    // Notu kaydet
    localStorage.setItem(`note_${user.id}_${currentEssayId}`, noteText);

    // Geçmişi güncelle (Eğer not varsa)
    let history = JSON.parse(localStorage.getItem(`history_${user.id}`)) || [];
    history = history.filter(item => item.id !== currentEssayId);
    if (noteText.trim() !== "") {
        history.unshift({ id: currentEssayId, title: title, date: new Date().toLocaleDateString('tr-TR') });
    }
    localStorage.setItem(`history_${user.id}`, JSON.stringify(history));

    document.getElementById('save-indicator').style.display = "block";
    setTimeout(() => { document.getElementById('save-indicator').style.display = "none"; }, 2000);
    renderHistory();
};

const renderHistory = () => {
    const user = getUser();
    const history = JSON.parse(localStorage.getItem(`history_${user.id}`)) || [];
    if (!historyContainer) return;

    historyContainer.innerHTML = history.length === 0 ? '<p style="color:#999; font-size:0.8rem; padding:10px;">Henüz not yok.</p>' :
        history.map(item => `
            <div class="history-item" onclick="displayMaterial('${item.id}')" 
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="font-weight: bold; font-size: 0.85rem;">${item.title}</div>
                <div style="font-size: 0.7rem; color: #888;">${item.date}</div>
            </div>
        `).join('');
};

// --- 4. AI MATERYAL OLUŞTURMA ---

const handleGenerateNewMaterial = async (e) => {
    e.preventDefault();
    const user = getUser();
    loader.classList.remove('hidden');
    preferencesModal.classList.add('hidden');

    const category = document.getElementById('interest-category').value;
    const difficulty = document.getElementById('difficulty-level').value;
    const length = document.getElementById('content-length').value;
    const promptDetails = `Write a ${length} English reading text about ${category} for ${difficulty} level. Response MUST be ONLY JSON: {"title": "...", "body": "..."}`;

    try {
        const response = await fetch(AI_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptDetails })
        });
        const responseData = await response.json();
        const rawText = responseData.candidates[0].content.parts[0].text;
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const contentData = JSON.parse(cleaned);

        const { data: newContent, error } = await _supabase.from('contents').insert({
            title: contentData.title,
            body: contentData.body,
            user_id: user.id
        }).select('id').single();

        if (error) throw error;
        await loadUserMaterials();
        displayMaterial(newContent.id);
    } catch (err) { alert("Hata: " + err.message); }
    finally { loader.classList.add('hidden'); }
};

const loadUserMaterials = async () => {
    const user = getUser();
    const { data } = await _supabase.from('contents').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
        materialsList.innerHTML = data.map(m => `<div class="material-item" data-id="${m.id}" onclick="displayMaterial('${m.id}')">${m.title}</div>`).join('');
    }
};

// --- 5. ETKİLEŞİMLER (EVENT LISTENERS) ---

// Kelimeye Tıklama
readingBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('word')) {
        const word = e.target.dataset.word;
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 80}px`;
        tooltip.style.display = 'flex';
        tooltipWord.textContent = word;
        tooltipMeaning.textContent = "Çevriliyor...";
        tooltipMeaning.textContent = await getTranslation(word);
        addWordBtn.onclick = async () => {
            const { error } = await _supabase.from('word_list').insert({ student_id: getUser().id, word, definition: tooltipMeaning.textContent, learning_status: 'learning' });
            if (!error) { alert("Kelime eklendi!"); tooltip.style.display = 'none'; }
        };
    } else tooltip.style.display = 'none';
});

// Kaydet Butonu ve Kısayol
document.getElementById('save-note-btn').onclick = saveCurrentNote;
noteTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveCurrentNote(); }
});

// Modal Kontrolleri
document.getElementById('new-material-btn').onclick = () => preferencesModal.classList.remove('hidden');
document.getElementById('close-modal-btn').onclick = () => preferencesModal.classList.add('hidden');
preferencesForm.onsubmit = handleGenerateNewMaterial;

// Sayfa Başlatıcı
window.displayMaterial = displayMaterial;
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) document.getElementById('welcome-message').innerText = `Hoş geldin, ${user.full_name}!`;
    loadUserMaterials();
    renderHistory();
});
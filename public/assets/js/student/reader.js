// assets/js/student/reader.js
import { _supabase } from '../supabaseClient.js';
let currentEssayId = null; // Aktif yazıyı takip etmek için
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
const materialsSidebar = document.getElementById('materials-sidebar'); // Sidebar'ı seçmek için eklendi

// Tooltip (Çeviri Kutusu) Elemanları
const tooltip = document.getElementById('translation-tooltip');
const tooltipWord = document.getElementById('tooltip-word');
const tooltipMeaning = document.getElementById('tooltip-meaning');
const addWordBtn = document.getElementById('add-to-wordlist-btn');

const AI_FUNCTION_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material';

const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- KELİMELERİ TIKLANABİLİR YAPMA ---
const wrapWords = (text) => {
    if(!text) return '';
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
    try {
        console.log("Seçilen Yazı ID:", contentId);
        currentEssayId = contentId; // ID'yi hafızaya al

        // 1. Görsel olarak aktif olanı işaretle
        document.querySelectorAll('.material-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`[data-id="${contentId}"]`);
        if (activeItem) activeItem.classList.add('active');

        // 2. Metni Supabase'den getir
        const { data, error } = await _supabase
            .from('contents')
            .select('*')
            .eq('id', contentId)
            .single();

        if (error) throw error;

        // 3. Başlık ve metni ekrana bas
        document.getElementById('reading-title').textContent = data.title;
        // Eğer wrapWords fonksiyonun varsa: document.getElementById('reading-body').innerHTML = wrapWords(data.body);
        document.getElementById('reading-body').innerHTML = data.body; 

        // 4. BU YAZIYA ÖZEL NOTU YÜKLE
        const user = JSON.parse(localStorage.getItem('user'));
        const savedNote = localStorage.getItem(`note_${user.id}_${contentId}`);
        const textarea = document.getElementById('note-textarea');
        if (textarea) textarea.value = savedNote || "";

    } catch (err) {
        console.error("Materyal yüklenirken hata oluştu:", err);
    }
};

// Çok Önemli: Tıklanabilmesi için pencereye bağla
window.displayMaterial = displayMaterial;

// --- KELİME TIKLAMA VE TOOLTIP KONUMLANDIRMA ---
readingBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('word')) {
        const word = e.target.getAttribute('data-word');
        const rect = e.target.getBoundingClientRect();

        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 80}px`;
        tooltip.style.display = 'flex';

        tooltipWord.textContent = word;
        tooltipMeaning.textContent = "Çevriliyor...";

        const meaning = await getTranslation(word);
        tooltipMeaning.textContent = meaning;

        addWordBtn.onclick = () => saveToWordlist(word, meaning);
    } else {
        tooltip.style.display = 'none';
    }
});

document.addEventListener('mousedown', (e) => {
    if (tooltip && !tooltip.contains(e.target) && !e.target.classList.contains('word')) {
        tooltip.style.display = 'none';
    }
});

// --- VERİTABANINA KAYDETME ---
const saveToWordlist = async (word, meaning) => {
    const user = getUser();
    if (!user) return;

    addWordBtn.disabled = true;
    addWordBtn.textContent = "Kaydediliyor...";

    const { error } = await _supabase
        .from('word_list')
        .insert({
            student_id: user.id,
            word: word,
            definition: meaning,
            learning_status: 'learning'
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
    if (!user || !materialsList) return;

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


// --- YENİ EKLENEN KOD: ÖDEV TAMAMLAMA MANTIĞI ---

// Sayfa en altına gelindiğinde "Ödevi Bitir" butonu göster
window.onscroll = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hwId = urlParams.get('hw_id');
    
    // Sadece URL'de hw_id varsa ve sayfanın sonuna gelinmişse çalış
    if (hwId && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        showFinishHwButton(hwId);
    }
};

const showFinishHwButton = async (hwId) => {
    // Eğer buton zaten varsa tekrar oluşturma
    if (document.getElementById('finish-hw-btn')) return;
    
    const user = getUser();
    
    // Bu ödevi daha önce tamamlamış mı diye kontrol et
    const { data: existingCompletion } = await _supabase
        .from('assignment_completions')
        .select('id')
        .eq('assignment_id', hwId)
        .eq('student_id', user.id)
        .single();
        
    // Eğer tamamlanmış bir kayıt varsa butonu gösterme
    if (existingCompletion) {
        return;
    }

    const btn = document.createElement('button');
    btn.id = 'finish-hw-btn';
    btn.textContent = "Ödevi Okudum ve Bitirdim ✅";
    btn.className = "cta-button";
    btn.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:1000; width:auto; padding:15px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);";
    
    btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = "Kaydediliyor...";
        
        const { error } = await _supabase
            .from('assignment_completions')
            .insert({ assignment_id: hwId, student_id: user.id });
        
        if (error) {
            alert("Bir hata oluştu: " + error.message);
            btn.disabled = false;
            btn.textContent = "Ödevi Okudum ve Bitirdim ✅";
        } else {
            alert("Ödev başarıyla tamamlandı!");
            window.location.href = "../../student.html"; // Dashboard'a yönlendir
        }
    };
    document.body.appendChild(btn);
};
// Notu kaydetme fonksiyonu
const saveCurrentNote = () => {
    if (!currentEssayId) return alert("Lütfen önce bir yazı seçin!");

    const user = JSON.parse(localStorage.getItem('user'));
    const noteText = document.getElementById('note-textarea').value;
    const title = document.getElementById('reading-title').textContent;

    // 1. Notu o yazıya özel kaydet
    localStorage.setItem(`note_${user.id}_${currentEssayId}`, noteText);

    // 2. Not Geçmişi listesini güncelle
    let history = JSON.parse(localStorage.getItem(`history_${user.id}`)) || [];
    history = history.filter(item => item.id !== currentEssayId); // Eskisini sil
    
    if (noteText.trim() !== "") {
        history.unshift({
            id: currentEssayId,
            title: title,
            date: new Date().toLocaleDateString('tr-TR')
        });
    }

    localStorage.setItem(`history_${user.id}`, JSON.stringify(history));
    
    // 3. Arayüzü güncelle
    document.getElementById('save-indicator').style.display = "block";
    setTimeout(() => { document.getElementById('save-indicator').style.display = "none"; }, 2000);
    
    renderHistory(); // Listeyi yenileyen fonksiyon (Adım 3)
};

window.saveCurrentNote = saveCurrentNote;
// Sol taraftaki listeyi doldurma fonksiyonu
const renderHistory = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const history = JSON.parse(localStorage.getItem(`history_${user.id}`)) || [];
    const container = document.getElementById('note-history-list');
    
    if (!container) return;

    container.innerHTML = history.map(item => `
        <div class="history-item" onclick="displayMaterial('${item.id}')" 
             style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
            <div style="font-weight: bold; font-size: 0.85rem;">${item.title}</div>
            <div style="font-size: 0.7rem; color: #888;">${item.date}</div>
        </div>
    `).join('');
};

// Sayfa açıldığında butonu ve geçmişi bağla
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    const saveBtn = document.getElementById('save-note-btn');
    if (saveBtn) saveBtn.onclick = saveCurrentNote;
});

// --- SAYFA BAŞLATMA ---
const initializePage = async () => {
    const user = getUser();
    if (user) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    
    const urlParams = new URLSearchParams(window.location.search);
    const hwId = urlParams.get('hw_id');

    if (hwId) {
        // Bu bir ödev okuması, normal materyal listesini gizle
        if(materialsSidebar) materialsSidebar.style.display = 'none';
        
        // Ödevin content_id'sini al ve materyali göster
        const { data: assignment, error } = await _supabase
            .from('assignments')
            .select('content_id')
            .eq('id', hwId)
            .single();
            
        if (error || !assignment) {
            readingTitle.textContent = "Hata";
            readingBody.innerHTML = "Bu ödev bulunamadı veya erişim yetkiniz yok.";
        } else {
            displayMaterial(assignment.content_id);
        }

    } else {
        // Normal okuma sayfası, kullanıcının kendi materyallerini yükle
        loadUserMaterials();
        if(materialsList) {
            materialsList.addEventListener('click', (e) => {
                if (e.target.classList.contains('material-item')) displayMaterial(e.target.dataset.id);
            });
        }
    }

    // Genel event listener'lar
    if(logoutButton) logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
    if(newMaterialBtn) newMaterialBtn.addEventListener('click', () => preferencesModal.classList.remove('hidden'));
    if(closeModalBtn) closeModalBtn.addEventListener('click', () => preferencesModal.classList.add('hidden'));
    if(preferencesForm) preferencesForm.addEventListener('submit', handleGenerateNewMaterial);
    // Kaydet butonuna basınca çalıştır
document.getElementById('save-note-btn').onclick = saveCurrentNote;

// Ctrl + Enter ile kaydetme özelliği
document.getElementById('note-textarea').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        saveCurrentNote();
    }
});

// Sayfa açıldığında geçmişi göster
renderHistory();
};
// Fonksiyonları global hale getir (HTML'den çağrılabilmesi için)
window.displayMaterial = displayMaterial;
window.saveCurrentNote = saveCurrentNote;

// Butonu bağla
const saveBtn = document.getElementById('save-note-btn');
if (saveBtn) saveBtn.onclick = saveCurrentNote;

// Sayfa ilk açıldığında geçmişi yükle
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
});
document.addEventListener('DOMContentLoaded', initializePage);

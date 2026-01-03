import { _supabase } from '../supabaseClient.js';

/* ========= GENEL DEĞİŞKENLER & SEÇİCİLER ========= */
let currentEssayId = null;

/**
 * ✅ Student sayfaları (public/pages/student/*) içinden
 * ana giriş sayfasına güvenli dönüş:
 */
const goHome = () => {
  localStorage.removeItem('user');
  window.location.href = '../../index.html'; // ✅ FIX: /index.html DEĞİL
};

const getUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readingTitle = document.getElementById('reading-title');
const readingBody = document.getElementById('reading-body');
const materialsList = document.getElementById('materials-list');
const noteTextarea = document.getElementById('note-textarea');
const historyContainer = document.getElementById('note-history-list');

const tooltip = document.getElementById('translation-tooltip');
const tooltipWord = document.getElementById('tooltip-word');
const tooltipMeaning = document.getElementById('tooltip-meaning');
const addWordBtn = document.getElementById('add-to-wordlist-btn');
const playPronunciationBtn = document.getElementById('play-pronunciation-btn');

const preferencesModal = document.getElementById('preferences-modal');
const preferencesForm = document.getElementById('preferences-form');
const loader = document.getElementById('loader');

const favoriteBtn = document.getElementById('favorite-btn');
const welcomeMessageEl = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');

const AI_FUNCTION_URL =
  'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material';

/* ========= YARDIMCI: TARİH FORMATLAMA ========= */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('tr-TR', options);
};

// ========= KELİME SESLENDİRME (DOĞRU VE SON HALİ) =========
const speakWord = (word) => {
  try {
    // HATA BURADAYDI. `getURL` yerine URL'yi kendimiz oluşturuyoruz.
    // Proje URL'niz ekran görüntüsünden belli: https://infmglbngspopnxrjnfv.supabase.co
    const projectUrl = 'https://infmglbngspopnxrjnfv.supabase.co';
    
    // Fonksiyonun tam URL'sini oluşturuyoruz.
    const ttsFunctionUrl = `${projectUrl}/functions/v1/get-pronunciation?text=${encodeURIComponent(word)}`;

    // Bu URL'yi kaynak olarak kullanan yeni bir ses nesnesi oluştur.
    const audio = new Audio(ttsFunctionUrl);

    // Sesi çal.
    audio.play();

  } catch (error) {
    console.error("Telaffuz oynatılırken hata oluştu:", error);
    alert("Sesli telaffuz şu an kullanılamıyor.");
  }
};


/* ========= FAVORİ YÖNETİMİ ========= */
const getFavorites = () => {
  const user = getUser();
  if (!user) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(`favorites_${user.id}`));
    return Array.isArray(stored) ? stored.map((id) => String(id)) : [];
  } catch {
    return [];
  }
};

const saveFavorites = (favorites) => {
  const user = getUser();
  if (!user) return;
  localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favorites));
};

const updateFavoriteIcon = () => {
  if (!favoriteBtn) return;

  if (!currentEssayId) {
    favoriteBtn.classList.remove('active');
    favoriteBtn.innerHTML = '♡';
    favoriteBtn.title = 'Favorilere ekle';
    return;
  }

  const favorites = getFavorites();
  const isFav = favorites.includes(String(currentEssayId));

  if (isFav) {
    favoriteBtn.classList.add('active');
    favoriteBtn.innerHTML = '♥';
    favoriteBtn.title = 'Favorilerimden kaldır';
  } else {
    favoriteBtn.classList.remove('active');
    favoriteBtn.innerHTML = '♡';
    favoriteBtn.title = 'Favorilere ekle';
  }
};

// favorites.html için dışarı aç
window.getReadingFavorites = getFavorites;

/* ========= 1) KELİME ÇEVİRİ ========= */
const wrapWords = (text) => {
  if (!text) return '';
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/\w+/.test(part)) {
        const cleanWord = part.replace(/[.,!?;:()]/g, '');
        const punctuation = part.replace(cleanWord, '');
        return `<span class="word" data-word="${cleanWord}">${cleanWord}</span>${punctuation}`;
      }
      return part;
    })
    .join('');
};

const getTranslation = async (word) => {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${word}&langpair=en|tr`
    );
    const data = await res.json();
    return data.responseData.translatedText || 'Çeviri bulunamadı';
  } catch {
    return 'Bağlantı hatası';
  }
};

/* ========= OKUNDU SAY (Supabase) =========
   Metin sağ panelde render olduysa 1 kere okundu say.
*/
const markAsRead = async (contentId) => {
  // --- KONTROL İÇİN BU SATIRI EKLEYİN ---
  console.log('Okundu olarak işaretlenen metin ID:', contentId); 
  
  const user = getUser();
  if (!user || !contentId) return;

  const payload = {
    student_id: String(user.id),
    content_id: contentId,
    read_at: new Date().toISOString(),
  };

  const { error } = await _supabase
    .from('reading_logs')
    .upsert(payload, { onConflict: 'student_id,content_id' });

  if (error) console.error('markAsRead error:', error);
};

/* ========= 2) MATERYAL GÖRÜNTÜLEME ========= */
const displayMaterial = async (contentId) => {
  try {
    const user = getUser();
    if (!user) return goHome();

    currentEssayId = contentId;

    document.querySelectorAll('.material-item')
      .forEach((el) => el.classList.remove('active'));
    const selected = document.querySelector(`[data-id='${contentId}']`);
    if (selected) selected.classList.add('active');

    const { data, error } = await _supabase
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .single();

    if (error || !data) throw error || new Error('İçerik bulunamadı');

    if (readingTitle) readingTitle.textContent = data.title || '';
    if (readingBody) readingBody.innerHTML = wrapWords(data.body || '');

    await markAsRead(contentId);

    const savedNote = localStorage.getItem(`note_${user.id}_${contentId}`);
    if (noteTextarea) noteTextarea.value = savedNote || '';

    updateFavoriteIcon();
  } catch (err) {
    console.error('displayMaterial Hata:', err);
  }
};

window.displayMaterial = displayMaterial;

/* ========= 3) NOT & GEÇMİŞ ========= */
const getHistoryList = () => {
  const user = getUser();
  if (!user) return [];
  const raw = localStorage.getItem(`history_${user.id}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const renderHistory = () => {
  const user = getUser();
  if (!user || !historyContainer) return;

  const history = getHistoryList();

  if (history.length === 0) {
    historyContainer.innerHTML =
      '<p style="color:#999; font-size:0.8rem; padding:10px;">Henüz not yok.</p>';
    return;
  }

  historyContainer.innerHTML = history
    .map(
      (item) => `
        <div class="history-item"
             onclick="displayMaterial('${item.id}')"
             style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
          <div style="font-weight: bold; font-size: 0.85rem;">${item.title}</div>
          <div style="font-size: 0.7rem; color: #888;">${item.date}</div>
        </div>
      `
    )
    .join('');
};

const saveCurrentNote = () => {
  if (!currentEssayId) {
    alert('Önce bir yazı seçin!');
    return;
  }

  const user = getUser();
  if (!user) return goHome();

  const noteText = noteTextarea ? noteTextarea.value : '';
  const title = readingTitle ? readingTitle.textContent : '';

  localStorage.setItem(`note_${user.id}_${currentEssayId}`, noteText);

  let history = getHistoryList();
  history = history.filter((item) => String(item.id) !== String(currentEssayId));

  if (noteText.trim() !== '') {
    history.unshift({
      id: currentEssayId,
      title,
      date: new Date().toLocaleDateString('tr-TR'),
    });
  }

  localStorage.setItem(`history_${user.id}`, JSON.stringify(history));

  const indicator = document.getElementById('save-indicator');
  if (indicator) {
    indicator.style.display = 'block';
    setTimeout(() => (indicator.style.display = 'none'), 2000);
  }

  renderHistory();
};

/* ========= 4) AI MATERYAL OLUŞTURMA & LİSTE ========= */
const handleGenerateNewMaterial = async (e) => {
  e.preventDefault();
  const user = getUser();
  if (!user) return goHome();

  if (loader) loader.classList.remove('hidden');
  if (preferencesModal) preferencesModal.classList.add('hidden');

  const category = document.getElementById('interest-category')?.value;
  const difficulty = document.getElementById('difficulty-level')?.value;
  const length = document.getElementById('content-length')?.value;

  const promptDetails = `Write a ${length} English reading text about ${category} for ${difficulty} level. Response MUST be ONLY JSON: {"title": "...", "body": "..."}`;

  try {
    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptDetails }),
    });

    const responseData = await response.json();
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const contentData = JSON.parse(cleaned);

    const { data: newContent, error } = await _supabase
      .from('contents')
      .insert({
        title: contentData.title,
        body: contentData.body,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    await loadUserMaterials();
    await displayMaterial(newContent.id);
  } catch (err) {
    alert('Hata: ' + (err?.message || err));
    console.error(err);
  } finally {
    if (loader) loader.classList.add('hidden');
  }
};

const loadUserMaterials = async () => {
  const user = getUser();
  if (!user || !materialsList) return;

  const { data, error } = await _supabase
    .from('contents')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    materialsList.innerHTML =
      '<p style="color:red;font-size:0.85rem;">Materyaller yüklenirken hata oluştu.</p>';
    return;
  }

  if (!data || data.length === 0) {
    materialsList.innerHTML =
      '<p style="color:#9ca3af;font-size:0.85rem;">Henüz materyal oluşturmadın.</p>';
    return;
  }

  materialsList.innerHTML = data
    .map(
      (m) => `
        <div class="material-item"
             data-id="${m.id}"
             onclick="displayMaterial('${m.id}')"
             style="padding:12px 10px;border-bottom:1px solid #e5e7eb;cursor:pointer;">
          <div style="font-weight:600;font-size:0.95rem;">${m.title}</div>
          <div style="font-size:0.75rem;color:#6b7280;">
            ${formatDate(m.created_at)}
          </div>
        </div>
      `
    )
    .join('');
};

/* ========= EVENT LISTENER'LAR ========= */
if (readingBody) {
  readingBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('word')) {
      const word = e.target.dataset.word;
      const rect = e.target.getBoundingClientRect();

      if (tooltip) {
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 95}px`;
        tooltip.style.display = 'flex';
      }

      if (tooltipWord) tooltipWord.textContent = word;

      if (tooltipMeaning) {
        tooltipMeaning.textContent = 'Çevriliyor...';
        tooltipMeaning.textContent = await getTranslation(word);
      }

      if (addWordBtn) {
        addWordBtn.onclick = async () => {
          const user = getUser();
          if (!user) return goHome();

          const { error } = await _supabase.from('word_list').insert({
            student_id: user.id,
            word,
            definition: tooltipMeaning?.textContent || '',
            learning_status: 'learning',
          });

          if (!error) {
            alert('Kelime eklendi!');
            if (tooltip) tooltip.style.display = 'none';
          }
        };
      }

      if (playPronunciationBtn) {
        playPronunciationBtn.onclick = () => {
          speakWord(word);
        };
      }

    } else {
      if (tooltip) tooltip.style.display = 'none';
    }
  });
}

const saveBtn = document.getElementById('save-note-btn');
if (saveBtn) saveBtn.onclick = saveCurrentNote;

if (noteTextarea) {
  noteTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      saveCurrentNote();
    }
  });
}

const newMaterialBtn = document.getElementById('new-material-btn');
const closeModalBtn  = document.getElementById('close-modal-btn');

if (newMaterialBtn && preferencesModal) {
  newMaterialBtn.onclick = () => preferencesModal.classList.remove('hidden');
}
if (closeModalBtn && preferencesModal) {
  closeModalBtn.onclick = () => preferencesModal.classList.add('hidden');
}
if (preferencesForm) {
  preferencesForm.onsubmit = handleGenerateNewMaterial;
}

if (favoriteBtn) {
  favoriteBtn.addEventListener('click', () => {
    if (!currentEssayId) {
      alert('Önce bir yazı seçin!');
      return;
    }

    const favorites = getFavorites();
    const idStr = String(currentEssayId);

    if (favorites.includes(idStr)) {
      saveFavorites(favorites.filter((id) => id !== idStr));
    } else {
      favorites.push(idStr);
      saveFavorites(favorites);
    }

    updateFavoriteIcon();
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', goHome);
}

/* ========= SAYFA BAŞLATICI ========= */
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return goHome();

  if (welcomeMessageEl) {
    welcomeMessageEl.innerText = `Hoş geldin, ${user.full_name}!`;
  }

  loadUserMaterials();
  renderHistory();
  updateFavoriteIcon();

  if (user.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if (imgEl) imgEl.src = user.avatar_url;
  }
});
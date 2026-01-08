import { _supabase } from '../supabaseClient.js';
 
const wordListBody = document.getElementById('word-list-body');
const searchInput = document.getElementById('search-word');
const filterSelect = document.getElementById('filter-status');
const welcomeMessage = document.getElementById('welcome-message');
 
const getUser = () => JSON.parse(localStorage.getItem('user'));

// ========= KELİME SESLENDİRME FONKSİYONU =========
const speakWord = (word) => {
  try {
    const projectUrl = 'https://infmglbngspopnxrjnfv.supabase.co'; // Kendi Proje URL'niz
    const ttsFunctionUrl = `${projectUrl}/functions/v1/get-pronunciation?text=${encodeURIComponent(word)}`;

    const audio = new Audio(ttsFunctionUrl);
    audio.play();

  } catch (error) {
    console.error("Error playing pronunciation:", error);
    alert("Audio pronunciation is currently unavailable.");
  }
};
// =======================================================
 
let allWords = [];
 
// --- KELİMELERİ YÜKLE ---
const loadWords = async () => {
    const user = getUser();
    if (!user) return;
 
    let { data, error } = await _supabase
        .from('word_list') 
        .select('*')
        .eq('student_id', user.id)
        .order('added_at', { ascending: false });
 
    if (error) {
        console.error("Word list could not be loaded:", error);
        return;
    }
 
    allWords = data; 
    filterData(); 
};
 
// --- EKRANA BAS (RenderWords) FONKSİYONU GÜNCELLENDİ ---
const renderWords = (words) => {
    wordListBody.innerHTML = '';
    if (words.length === 0) {
        document.getElementById('no-words').classList.remove('hidden');
        return;
    }
    document.getElementById('no-words').classList.add('hidden');

    words.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.added_at).toLocaleDateString('tr-TR');
        
        // --- BU BÖLÜM GÜNCELLENDİ ---
        row.innerHTML = `
            <td>
                <!-- YENİ: İçerik bir div içine alındı -->
                <div class="word-container">
                    <strong>${item.word}</strong>
                    <button class="action-btn speak-btn" onclick="speakWord('${item.word}')" title="Listen to Pronunciation">🔊</button>
                </div>
            </td>
            <td>${item.definition}</td>
            <td><span class="status-badge status-${item.learning_status}">${item.learning_status === 'learning' ? 'Learning' : 'Learned'}</span></td>
            <td>${date}</td>
            <td>
                <button class="action-btn learned-btn" onclick="updateStatus(${item.id}, '${item.learning_status}')">✔️</button>
                <button class="action-btn delete-btn" onclick="deleteWord(${item.id})">🗑️</button>
            </td>
        `;
        // --- GÜNCELLEME SONU ---

        wordListBody.appendChild(row);
    });
};
 
// --- FİLTRELEME VE ARAMA FONKSİYONU ---
const filterData = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = filterSelect.value;
 
    const filtered = allWords.filter(w => {
        const matchesSearch = w.word.toLowerCase().includes(searchTerm) || 
                              (w.definition && w.definition.toLowerCase().includes(searchTerm));
        const matchesStatus = filterStatus === 'all' || w.learning_status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    renderWords(filtered);
};
 
 
// --- SİLME ---
window.deleteWord = async (id) => {
    if (!confirm("Are you sure you want to delete this word?")) return;
 
    const { error } = await _supabase
        .from('word_list')
        .delete()
        .eq('id', id);
 
    if (error) alert("Delete error: " + error.message);
    else loadWords();
};
 
// --- DURUM GÜNCELLEME ---
window.updateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'learning' ? 'learned' : 'learning';
 
    const { error } = await _supabase
        .from('word_list')
        .update({ learning_status: newStatus })
        .eq('id', id);
 
    if (error) alert("Update error: " + error.message);
    else loadWords();
};

window.speakWord = speakWord;
 
// --- OLAY DİNLEYİCİLERİ ---
searchInput.addEventListener('input', filterData);
filterSelect.addEventListener('change', filterData);
 
 
// --- SAYFA BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
    loadWords();
});

const userAvatar = JSON.parse(localStorage.getItem('user'));
if (userAvatar && userAvatar.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if(imgEl) imgEl.src = userAvatar.avatar_url;
}

/* ✅ SADECE EKLENEN KISIM: ÇIKIŞ YAP BUTONU */
const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = "../../index.html";
    });
}

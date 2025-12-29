import { _supabase } from '../supabaseClient.js';

const wordListBody = document.getElementById('word-list-body');
const searchInput = document.getElementById('search-word');
const filterSelect = document.getElementById('filter-status');
const welcomeMessage = document.getElementById('welcome-message');

const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- KELİMELERİ YÜKLE ---
const loadWords = async () => {
    const user = getUser();
    if (!user) return;

    // TABLO ADI: word_list (Senin veritabanındaki isim)
    let { data, error } = await _supabase
        .from('word_list') 
        .select('*')
        .eq('student_id', user.id) // SÜTUN ADI: student_id
        .order('added_at', { ascending: false }); // SÜTUN ADI: added_at

    if (error) {
        console.error("Kelime listesi yüklenemedi:", error);
        return;
    }

    renderWords(data);
};

// --- EKRANA BAS ---
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
        
        row.innerHTML = `
            <td><strong>${item.word}</strong></td>
            <td>${item.definition}</td>
            <td><span class="status-badge status-${item.learning_status}">${item.learning_status === 'learning' ? 'Öğreniyorum' : 'Öğrenildi'}</span></td>
            <td>${date}</td>
            <td>
                <button class="action-btn learned-btn" onclick="updateStatus(${item.id}, '${item.learning_status}')">✔️</button>
                <button class="action-btn delete-btn" onclick="deleteWord(${item.id})">🗑️</button>
            </td>
        `;
        wordListBody.appendChild(row);
    });
};

// --- FİLTRELEME ---
const filterData = (allWords) => {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = filterSelect.value;

    const filtered = allWords.filter(w => {
        const matchesSearch = w.word.toLowerCase().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || w.learning_status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    renderWords(filtered);
};

// --- SİLME (Global fonksiyon yapıyoruz onclick için) ---
window.deleteWord = async (id) => {
    if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;

    const { error } = await _supabase
        .from('word_list')
        .delete()
        .eq('id', id);

    if (error) alert("Silme hatası: " + error.message);
    else loadWords(); // Listeyi yenile
};

// --- DURUM GÜNCELLEME ---
window.updateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'learning' ? 'learned' : 'learning';

    const { error } = await _supabase
        .from('word_list')
        .update({ learning_status: newStatus })
        .eq('id', id);

    if (error) alert("Güncelleme hatası: " + error.message);
    else loadWords();
};

// --- SAYFA BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    loadWords();
});
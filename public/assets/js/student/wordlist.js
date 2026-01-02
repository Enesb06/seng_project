import { _supabase } from '../supabaseClient.js';
 
const wordListBody = document.getElementById('word-list-body');
const searchInput = document.getElementById('search-word');
const filterSelect = document.getElementById('filter-status');
const welcomeMessage = document.getElementById('welcome-message');
 
const getUser = () => JSON.parse(localStorage.getItem('user'));
 
// 🚨 YENİ: Tüm kelimeleri saklamak için global değişken
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
        console.error("Kelime listesi yüklenemedi:", error);
        return;
    }
 
    // 🚨 YENİ: Çekilen tüm veriyi global değişkene kaydet
    allWords = data; 
    // 🚨 YENİ: Filtrele ve Ara fonksiyonunu çağır (Ekrana ilk yükleme için)
    filterData(); 
};
 
// --- EKRANA BAS (RenderWords) fonksiyonu aynı kalacak, SADECE parametresini değiştiriyoruz ---
const renderWords = (words) => {
    // ... (Kodun geri kalanı aynı)
    wordListBody.innerHTML = '';
    if (words.length === 0) {
        document.getElementById('no-words').classList.remove('hidden');
        return;
    }
    document.getElementById('no-words').classList.add('hidden');
 
    words.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.added_at).toLocaleDateString('tr-TR');
        // ... (HTML oluşturma kısmı aynı kalır)
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
 
// --- FİLTRELEME VE ARAMA FONKSİYONU (GÜNCELLENDİ) ---
// Artık allWords'ü parametre olarak beklemiyor, global değişkenden okuyor
const filterData = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = filterSelect.value;
 
    const filtered = allWords.filter(w => {
        // Kontrol 1: Arama kelimesiyle eşleşiyor mu? (word veya definition kontrolü)
        const matchesSearch = w.word.toLowerCase().includes(searchTerm) || 
                              (w.definition && w.definition.toLowerCase().includes(searchTerm)); // 'definition' null olabilir
        // Kontrol 2: Durum filtresiyle eşleşiyor mu?
        const matchesStatus = filterStatus === 'all' || w.learning_status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    renderWords(filtered);
};
 
 
// --- DİĞER FONKSİYONLARIN GÜNCELLENMESİ ---
// Silme ve Durum güncelleme fonksiyonlarında da veriyi yeniden yükledikten sonra
// filtrelemeyi tetiklemek yerine, direkt loadWords'ü çağırıyoruz. (Zaten loadWords -> filterData yapacak)
 
// --- SİLME (Global fonksiyon yapıyoruz onclick için) ---
window.deleteWord = async (id) => {
    // ... (silme kodu aynı)
    if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;
 
    const { error } = await _supabase
        .from('word_list')
        .delete()
        .eq('id', id);
 
    if (error) alert("Silme hatası: " + error.message);
    else loadWords(); // Sadece loadWords() çağrısı yeterli
};
 
// --- DURUM GÜNCELLEME ---
window.updateStatus = async (id, currentStatus) => {
    // ... (güncelleme kodu aynı)
    const newStatus = currentStatus === 'learning' ? 'learned' : 'learning';
 
    const { error } = await _supabase
        .from('word_list')
        .update({ learning_status: newStatus })
        .eq('id', id);
 
    if (error) alert("Güncelleme hatası: " + error.message);
    else loadWords(); // Sadece loadWords() çağrısı yeterli
};
 
// 🚨 YENİ: OLAY DİNLEYİCİLERİNİ BAŞLATMA
searchInput.addEventListener('input', filterData);
filterSelect.addEventListener('change', filterData);
 
 
// --- SAYFA BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    loadWords();
});
const userAvatar = JSON.parse(localStorage.getItem('user'));
if (userAvatar && userAvatar.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if(imgEl) imgEl.src = userAvatar.avatar_url;
}
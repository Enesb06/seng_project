import { _supabase } from '../supabaseClient.js';

const wordListBody = document.getElementById('word-list-body');
const searchInput = document.getElementById('search-word');
const filterSelect = document.getElementById('filter-status');
const welcomeMessage = document.getElementById('welcome-message');

const getUser = () => JSON.parse(localStorage.getItem('user'));

// ========= KELİME SESLENDİRME =========
const speakWord = (word) => {
  try {
    const projectUrl = 'https://infmglbngspopnxrjnfv.supabase.co';
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

// ========= SORTING FONKSİYONU =========
const sortWords = () => {
  const sortMode = document.getElementById('sort-select')?.value;
  if (!sortMode) return;

  if (sortMode === 'newest') {
    allWords.sort((a,b)=> new Date(b.added_at) - new Date(a.added_at));
  }
  else if (sortMode === 'oldest') {
    allWords.sort((a,b)=> new Date(a.added_at) - new Date(b.added_at));
  }
  else if (sortMode === 'az') {
    allWords.sort((a,b)=> a.word.localeCompare(b.word));
  }
  else if (sortMode === 'za') {
    allWords.sort((a,b)=> b.word.localeCompare(a.word));
  }
};
// =======================================================


// ========= LOAD WORDS =========
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
  sortWords();
  filterData();
};



// ========= RENDER (GÜNCELLENMİŞ FONKSİYON) =========
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

    // YENİ: Streak'in aktif olup olmamasına göre renk belirliyoruz.
    // 0 ise gri, 0'dan büyükse turuncu olacak.
    const streakColor = item.quiz_streak > 0 ? '#f97316' : '#6b7280'; // Turuncu veya Gri

    row.innerHTML = `
      <td>
        <div class="word-container">
          <strong>${item.word}</strong>
          <button class="action-btn speak-btn" onclick="speakWord('${item.word}')">
            <img class="btn-icon" src="https://cdn-icons-png.flaticon.com/512/4349/4349708.png">
          </button>
        </div>
      </td>

      <td>${item.definition}</td>

      <td><span class="status-badge status-${item.learning_status}">${item.learning_status === 'learning' ? 'Learning' : 'Learned'}</span></td>

      <td>${date}</td>

      <!-- GÜNCELLENMİŞ STREAK SÜTUNU -->
      <td style="text-align: center; font-weight: bold; font-size: 1.1em; color: ${streakColor};">
        ${item.quiz_streak} 🔥
      </td>
      
      <td>
        ${
          item.learning_status === 'learning'
          ? `<button class="action-btn mark-btn mark-learned" onclick="updateStatus(${item.id}, 'learning')">
               <img class="btn-icon" src="https://cdn-icons-png.flaticon.com/512/709/709510.png"> Learned
             </button>`
          : `<button class="action-btn mark-btn mark-revert" onclick="updateStatus(${item.id}, 'learned')">
               <img class="btn-icon" src="https://cdn-icons-png.flaticon.com/512/10405/10405763.png"> Move Back
             </button>`
        }
        <button class="action-btn delete-btn" onclick="deleteWord(${item.id})">
          <img class="btn-icon" src="https://cdn-icons-png.flaticon.com/512/10065/10065140.png">
        </button>
      </td>
    `;

    if (item.learning_status === 'learned') {
      row.classList.add('tr-learned');
    }

    wordListBody.appendChild(row);
  });
};


// ========= FILTER =========
const filterData = () => {
  const searchTerm = searchInput.value.toLowerCase();
  const filterStatus = filterSelect.value;

  const filtered = allWords.filter(w => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchTerm) ||
      (w.definition && w.definition.toLowerCase().includes(searchTerm));

    const matchesStatus = filterStatus === 'all' || w.learning_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  renderWords(filtered);
};



// ========= DELETE =========
window.deleteWord = async (id) => {
  if (!confirm("Are you sure you want to delete this word?")) return;

  const { error } = await _supabase
    .from('word_list')
    .delete()
    .eq('id', id);

  if (error) alert("Delete error: " + error.message);
  else loadWords();
};



// ========= UPDATE STATUS =========
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



// ========= EVENTS =========
searchInput.addEventListener('input', filterData);
filterSelect.addEventListener('change', filterData);

// SORT EVENT
document.getElementById('sort-select')?.addEventListener('change', () => {
  sortWords();
  filterData();
});



// ========= INIT =========
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (user) welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
  loadWords();
});



// ========= AVATAR =========
const userAvatar = JSON.parse(localStorage.getItem('user'));
if (userAvatar && userAvatar.avatar_url) {
  const imgEl = document.getElementById('header-avatar');
  if(imgEl) imgEl.src = userAvatar.avatar_url;
}



// ========= LOGOUT =========
const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = "../../index.html";
  });
}
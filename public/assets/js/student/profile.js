import { _supabase } from '../supabaseClient.js';

const getUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const dayKeyLocal = (dt) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysLocal = (dayKey, delta) => {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dayKeyLocal(dt);
};

/* ========= STREAK (HEADER) =========
   Streak = içerik oluşturulan günler + quiz çözülen günler
*/
const loadStreakHeader = async () => {
  const user = getUser();
  if (!user) return;

  const el = document.getElementById('streak-header');
  if (!el) return;

  // içerik oluşturma günleri
  const { data: contents, error: cErr } = await _supabase
    .from('contents')
    .select('created_at')
    .eq('user_id', String(user.id))
    .order('created_at', { ascending: false })
    .limit(500);

  // quiz günleri
  const { data: quizzes, error: qErr } = await _supabase
    .from('quiz_results')
    .select('created_at')
    .eq('student_id', String(user.id))
    .order('created_at', { ascending: false })
    .limit(500);

  if ((cErr && qErr) || ((!contents || contents.length === 0) && (!quizzes || quizzes.length === 0))) {
    el.classList.add('hidden');
    el.textContent = '';
    el.title = '';
    return;
  }

  const daySet = new Set();

  (contents || []).forEach(r => r.created_at && daySet.add(dayKeyLocal(new Date(r.created_at))));
  (quizzes || []).forEach(r => r.created_at && daySet.add(dayKeyLocal(new Date(r.created_at))));

  const today = dayKeyLocal(new Date());
  const yesterday = addDaysLocal(today, -1);

  let start = null;
  if (daySet.has(today)) start = today;
  else if (daySet.has(yesterday)) start = yesterday;

  let streak = 0;
  if (start) {
    let cursor = start;
    while (daySet.has(cursor)) {
      streak += 1;
      cursor = addDaysLocal(cursor, -1);
    }
  }

  if (streak <= 0) {
    el.classList.add('hidden');
    el.textContent = '';
    el.title = '';
    return;
  }

  el.classList.remove('hidden');
  el.textContent = `🔥 ${streak} Days`;
  el.title = `You have been active for ${streak} consecutive days 🔥`;
};

/* ========= ROZETLER (Profil: sadece kazanılanlar) ========= */
const getEarnedBadges = ({ reads, quizCount, quizAvg }) => {
  const earned = [];

  // Reading badges
  if (reads >= 1)   earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/8750/8750754.png',  name: 'First Text' });
  if (reads >= 10)  earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/16175/16175033.png', name: '10th Text' });
  if (reads >= 50)  earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/10552/10552976.png', name: '50th Text' });
  if (reads >= 100) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/3113/3113049.png',  name: '100th Text' });
  if (reads >= 200) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/4959/4959279.png',  name: '200th Text' });

  // Quiz badges
  if (quizCount >= 1) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/10292/10292284.png', name: 'First Quiz' });

  // Medals by average
  if (quizCount > 0) {
    if (quizAvg >= 90) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/2583/2583381.png', name: 'Gold Medal (90-100)' });
    else if (quizAvg >= 80) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/2583/2583350.png', name: 'Silver Medal (80-89)' });
    else if (quizAvg >= 70) earned.push({ image: 'https://cdn-icons-png.flaticon.com/512/2583/2583448.png', name: 'Bronze Medal (70-79)' });
  }

  return earned;
};


/* ========= PROFİL ========= */
const initializeProfile = async () => {
  const user = getUser();
  if (!user) {
    window.location.href = '../../index.html';
    return;
  }

  // Header
  const welcomeEl = document.getElementById('welcome-message');
  if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.full_name}!`;

  const avatarEl = document.getElementById('header-avatar');
  if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;

  // Kişisel bilgiler
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  if (nameEl) nameEl.textContent = user.full_name || '';
  if (emailEl) emailEl.textContent = user.email || '';

  // ✅ 1) Okuma Sayısı = contents sayısı
  const { count: readCount, error: readErr } = await _supabase
    .from('contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', String(user.id));

  const reads = (!readErr ? (readCount || 0) : 0);
  const statReadings = document.getElementById('stat-readings');
  if (statReadings) statReadings.textContent = String(reads);

  // 2) Öğrenilen Kelime
  const { count: wordCount } = await _supabase
    .from('word_list')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', String(user.id))
    .eq('learning_status', 'learned');

  const words = wordCount || 0;
  const statWords = document.getElementById('stat-words');
  if (statWords) statWords.textContent = String(words);

  // 3) Quiz geçmişi + ortalama
  const { data: quizData, error: quizErr } = await _supabase
    .from('quiz_results')
    .select('*')
    .eq('student_id', String(user.id))
    .order('created_at', { ascending: false });

  const historyBody = document.getElementById('quiz-history-body');

  let quizAvg = 0;
  let quizCount = 0;

  if (!quizErr && quizData && quizData.length > 0) {
    quizCount = quizData.length;

    let totalRate = 0;
    if (historyBody) historyBody.innerHTML = '';

    quizData.forEach(res => {
      totalRate += (res.success_rate || 0);
      const date = new Date(res.created_at).toLocaleDateString('tr-TR');

      if (historyBody) {
        historyBody.innerHTML += `
          <tr>
            <td>${date}</td>
            <td>${res.score}</td>
            <td>${res.total_questions}</td>
            <td><strong>%${res.success_rate}</strong></td>
          </tr>
        `;
      }
    });

    quizAvg = Math.round(totalRate / quizCount);
  } else {
    if (historyBody) {
      historyBody.innerHTML = '<tr><td colspan="4">No quiz taken yet.</td></tr>';
    }
  }

  const statAvg = document.getElementById('stat-quiz-avg');
  if (statAvg) statAvg.textContent = `%${quizAvg}`;

  // Rozetleri bas (sadece kazanılanlar)
  const badgesContainer = document.getElementById('badges-container');
  if (badgesContainer) {
    const earned = getEarnedBadges({ reads, quizCount, quizAvg });

    if (earned.length === 0) {
      badgesContainer.innerHTML = '<p>You will earn badges as you progress!</p>';
    } else {
      badgesContainer.innerHTML = earned.map(b => `
        <div class="badge earned" title="${b.name}">
          <img src="${b.image}" alt="">
          <span>${b.name}</span>
        </div>
      `).join('');
    }
  }

  // 🔥 Streak header
  await loadStreakHeader();
};

/* ========= ÇIKIŞ ========= */
const bindLogout = () => {
  const btn = document.getElementById('logout-button');
  if (!btn) return;

  btn.onclick = () => {
    localStorage.removeItem('user');
    window.location.href = '../../index.html';
  };
};

document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  await initializeProfile();
});

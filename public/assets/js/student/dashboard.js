import { _supabase } from '../supabaseClient.js';

/* ========= ELEMENTLER ========= */
const welcomeMessage    = document.getElementById('welcome-message');
const logoutButton      = document.getElementById('logout-button');

const totalReadingsStat = document.getElementById('total-readings-stat');
const learnedWordsStat  = document.getElementById('learned-words-stat');
const quizSuccessStat   = document.getElementById('quiz-success-stat');

const badgeList         = document.getElementById('badge-list');

const joinClassBtn      = document.getElementById('join-class-btn');
const classCodeInput    = document.getElementById('class-code-input');
const joinMessage       = document.getElementById('join-message');

const streakHeaderEl    = document.getElementById('streak-header');

/* ========= GÜVENLİ ÇIKIŞ (PATH FIX) ========= */
const goHome = () => {
  localStorage.removeItem('user');

  // bulunduğun sayfanın klasörüne göre index.html'e gider
  // student.html /pages/... fark etmez
  window.location.href = new URL('index.html', window.location.href).href;
};

/* ========= BADGE TANIMLARI relaxed ========= */
const BADGES = [
  { key: 'read_1',   name: 'First Text',   image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', rule: (s) => s.reads >= 1 },
  { key: 'quiz_1',   name: 'First Quiz',    image: 'https://cdn-icons-png.flaticon.com/512/899/899624.png',  rule: (s) => s.quizzes >= 1 },
  { key: 'read_10',  name: '10th Text',   image: 'https://cdn-icons-png.flaticon.com/512/2921/2921148.png', rule: (s) => s.reads >= 10 },
  { key: 'read_50',  name: '50th Text',   image: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png', rule: (s) => s.reads >= 50 },
  { key: 'read_100', name: '100th Text',  image: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png', rule: (s) => s.reads >= 100 },
  { key: 'read_200', name: '200th Text',  image: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png', rule: (s) => s.reads >= 200 },

  { key: 'medal_gold',   name: 'Gold Medal',  image: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png', rule: (s) => s.quizAvg >= 90 },
  { key: 'medal_silver', name: 'Silver Medal',  image: 'https://cdn-icons-png.flaticon.com/512/2583/2583319.png', rule: (s) => s.quizAvg >= 80 && s.quizAvg < 90 },
  { key: 'medal_bronze', name: 'Bronze Medal',  image: 'https://cdn-icons-png.flaticon.com/512/2583/2583330.png', rule: (s) => s.quizAvg >= 70 && s.quizAvg < 80 },
];

const pickMedalKey = (avg) => {
  if (avg >= 90) return 'medal_gold';
  if (avg >= 80) return 'medal_silver';
  if (avg >= 70) return 'medal_bronze';
  return null;
};

/* ========= HELPERS ========= */
const getUserSafe = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const toDayKey = (iso) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dayKey, delta) => {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDayKey(dt.toISOString());
};

/* ========= DASHBOARD INIT ========= */
const loadStudentDashboard = async () => {
  const user = getUserSafe();
  if (!user) return goHome();
  if (user.role !== 'student') return goHome();

  if (welcomeMessage) welcomeMessage.innerText = `Welcome, ${user.full_name}!`;

  // avatar
  if (user.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if (imgEl) imgEl.src = user.avatar_url;
  }

  // istatistik + rozet
  const stats = await loadStats(user.id);
  loadBadges(stats);

  // streak
  await loadStreak(user.id);

  // sınıf/ödev
  await loadMyClassAndHomework(user.id);
  subscribeAssignmentsRealtime(user.id);
};

/* ========= STATİKLER =========
   Okuma = "oluşturulan metin" (contents)
*/
const loadStats = async (userId) => {
  try {
    const { count: readCount, error: readErr } = await _supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (readErr) console.error('readCount error:', readErr);

    const { count: wordCount, error: wordErr } = await _supabase
      .from('word_list')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('learning_status', 'learned');

    if (wordErr) console.error('wordCount error:', wordErr);

    const { data: quizData, error: quizErr } = await _supabase
      .from('quiz_results')
      .select('success_rate')
      .eq('student_id', userId);

    if (quizErr) console.error('quizData error:', quizErr);

    const quizzes = quizData?.length || 0;
    let avg = 0;
    if (quizzes > 0) {
      const total = quizData.reduce((sum, r) => sum + (r.success_rate || 0), 0);
      avg = Math.round(total / quizzes);
    }

    if (totalReadingsStat) totalReadingsStat.innerText = readCount || 0;
    if (learnedWordsStat)  learnedWordsStat.innerText  = wordCount || 0;
    if (quizSuccessStat)   quizSuccessStat.innerText   = `%${avg}`;

    return {
      reads: readCount || 0,
      words: wordCount || 0,
      quizAvg: avg || 0,
      quizzes
    };
  } catch (err) {
    console.error('loadStats fatal:', err);
    if (totalReadingsStat) totalReadingsStat.innerText = '0';
    if (learnedWordsStat)  learnedWordsStat.innerText  = '0';
    if (quizSuccessStat)   quizSuccessStat.innerText   = '%0';
    return { reads: 0, words: 0, quizAvg: 0, quizzes: 0 };
  }
};

/* ========= ROZETLER ========= */
const loadBadges = (stats) => {
  if (!badgeList) return;

  const medalKey = pickMedalKey(stats.quizAvg);

  badgeList.innerHTML = BADGES.map(b => {
    let earned = false;
    if (b.key.startsWith('medal_')) earned = (medalKey === b.key);
    else earned = !!b.rule(stats);

    return `
      <div class="badge ${earned ? 'earned' : 'locked'}" title="${b.name}">
        <img src="${b.image}" alt="${b.name}">
        <span>${b.name}</span>
      </div>
    `;
  }).join('');
};

/* ========= STREAK (contents + quiz) ========= */
const loadStreak = async (userId) => {
  try {
    const { data: contents } = await _supabase
      .from('contents')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: quizzes } = await _supabase
      .from('quiz_results')
      .select('created_at')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    const daySet = new Set();
    (contents || []).forEach(r => r.created_at && daySet.add(toDayKey(r.created_at)));
    (quizzes || []).forEach(r => r.created_at && daySet.add(toDayKey(r.created_at)));

    const todayKey = toDayKey(new Date().toISOString());
    const yesterdayKey = addDays(todayKey, -1);

    let startKey = null;
    if (daySet.has(todayKey)) startKey = todayKey;
    else if (daySet.has(yesterdayKey)) startKey = yesterdayKey;

    let streak = 0;
    if (startKey) {
      let cursor = startKey;
      while (daySet.has(cursor)) {
        streak += 1;
        cursor = addDays(cursor, -1);
      }
    }

    if (!streakHeaderEl) return;

    if (streak >= 1) {
      streakHeaderEl.classList.remove('hidden');
      streakHeaderEl.textContent = `🔥 ${streak} days`;
      streakHeaderEl.title = `You have been active for ${streak} consecutive days`;
    } else {
      streakHeaderEl.classList.add('hidden');
      streakHeaderEl.textContent = '';
      streakHeaderEl.title = '';
    }
  } catch (e) {
    console.error('loadStreak error:', e);
    if (streakHeaderEl) {
      streakHeaderEl.classList.add('hidden');
      streakHeaderEl.textContent = '';
      streakHeaderEl.title = '';
    }
  }
};

/* ========= SINIF & ÖDEVLER ========= */
const loadMyClassAndHomework = async (studentId) => {
  const classInfoArea = document.getElementById('class-info-area');
  const hwList = document.getElementById('homework-list');

  try {
    const { data: membership, error: memErr } = await _supabase
      .from('class_members')
      .select('class_id, classes(class_name, class_code)')
      .eq('student_id', studentId)
      .maybeSingle();

    if (memErr) console.error('membership error:', memErr);

    if (!membership) {
      if (classInfoArea) classInfoArea.innerHTML = "<p>You haven't joined a class yet.</p>";
      if (hwList) hwList.innerHTML = "";
      return;
    }

    if (classInfoArea) {
      classInfoArea.innerHTML = `
        <strong>Class:</strong> ${membership.classes.class_name}
        <small>(Code: ${membership.classes.class_code})</small>
      `;
    }

    const { data: assignments, error: asgErr } = await _supabase
      .from('assignments')
      .select('id, title, description, due_date, assignment_completions(completed_at)')
      .eq('class_id', membership.class_id);

    if (asgErr) console.error('assignments error:', asgErr);

    if (!hwList) return;

    if (!assignments || assignments.length === 0) {
      hwList.innerHTML = "<p>No assignments for this class.</p>";
      return;
    }

    hwList.innerHTML = assignments.map(hw => {
      const completion = hw.assignment_completions?.[0];
      const isDone = !!completion;

      let statusHTML = `
        <button class="cta-button read-btn"
          data-id="${hw.id}"
          style="width:auto;padding:5px 12px;">
          Read Assignment Content
        </button>

        <button class="cta-button complete-btn"
          data-id="${hw.id}"
          style="width:auto;padding:5px 12px;background:#16a34a;margin-left:6px;">
          Completed
        </button>
      `;

      if (isDone) {
        const dueDay = new Date(hw.due_date).toISOString().split('T')[0];
        const completedDay = new Date(completion.completed_at).toISOString().split('T')[0];
        const isLate = completedDay > dueDay;

        statusHTML = `
          <button class="cta-button read-btn"
            data-id="${hw.id}"
            style="width:auto;padding:5px 12px;">
            Read Assignment Content
          </button>

          <span style="margin-left:10px;color:${isLate ? 'orange' : 'green'};">
            ${isLate ? '🟠 Late Submission' : '✅ On Time'}
          </span>
        `;
      }


      return `
        <li class="hw-item"
          style="padding:15px;border:1px solid #eee;border-radius:8px;margin-bottom:12px;">

          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h4 style="margin:0;">${hw.title}</h4>
              <small>Due date: ${new Date(hw.due_date).toLocaleDateString('tr-TR')}</small>
            </div>
            <div>${statusHTML}</div>
          </div>

          <div id="content-${hw.id}"
            style="display:none;margin-top:10px;padding:10px;background:#f9fafb;border-radius:6px;">
            ${hw.description || "No content added for this assignment."}
          </div>
        </li>
      `;
    }).join('');
  } catch (e) {
    console.error('loadMyClassAndHomework fatal:', e);
    if (classInfoArea) classInfoArea.innerHTML = "<p>Class information could not be loaded.</p>";
    if (hwList) hwList.innerHTML = "";
  }
};

/* ========= ÖDEV AÇ/KAPAT ========= */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("read-btn")) {
    const id = e.target.dataset.id;
    const content = document.getElementById(`content-${id}`);
    if (!content) return;

    const open = content.style.display === "block";
    content.style.display = open ? "none" : "block";
    e.target.textContent = open ? "Read Assignment Content" : "Close";
  }
});

/* ========= TAMAMLADIM ========= */
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("complete-btn")) {
    const assignmentId = e.target.dataset.id;
    const user = getUserSafe();
    if (!user) return goHome();

    const { error } = await _supabase.from("assignment_completions").insert({
      assignment_id: assignmentId,
      student_id: user.id,
      completed_at: new Date().toISOString()
    });

    if (error) {
      console.error('complete-btn insert error:', error);
      alert("Could not save (Supabase). Check console.");
      return;
    }

    alert("Assignment completed ✔");
    await loadMyClassAndHomework(user.id);
  }
});

/* ========= SINIFA KATIL ========= */
const handleJoinClass = async () => {
  const user = getUserSafe();
  if (!user) return goHome();

  const code = (classCodeInput?.value || '').trim().toUpperCase();

  if (code.length < 6) {
    showMessage("Enter 6-digit code", "red");
    return;
  }

  const { data: classData, error: classErr } = await _supabase
    .from('classes')
    .select('id, class_name')
    .eq('class_code', code)
    .maybeSingle();

  if (classErr) console.error('class lookup error:', classErr);

  if (!classData) {
    showMessage("Invalid class code", "red");
    return;
  }

  const { error: insErr } = await _supabase.from('class_members').insert({
    class_id: classData.id,
    student_id: user.id
  });

  if (insErr) {
    // aynı sınıfa tekrar katılma vs
    console.error('join insert error:', insErr);
    showMessage("Could not save participation (you may have already joined).", "red");
    return;
  }

  showMessage(`You joined class "${classData.class_name}"`, "green");
  setTimeout(() => window.location.reload(), 900);
};

const showMessage = (msg, color) => {
  if (!joinMessage) return;
  joinMessage.style.display = 'block';
  joinMessage.textContent = msg;
  joinMessage.style.color = color === "red" ? "#dc2626" : "#16a34a";
};

/* ========= EVENTLER ========= */
if (joinClassBtn) joinClassBtn.addEventListener('click', handleJoinClass);

if (logoutButton) logoutButton.addEventListener('click', goHome);

/* ========= REALTIME – ÖDEV GÜNCELLEMELERİ ========= */
let assignmentChannel = null;

const subscribeAssignmentsRealtime = (studentId) => {
  if (assignmentChannel) return;

  assignmentChannel = _supabase
    .channel('assignments-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assignments' },
      async () => {
        console.log('📡 Assignment updated → refreshing student screen');
        await loadMyClassAndHomework(studentId);
      }
    )
    .subscribe();
};

document.addEventListener('DOMContentLoaded', loadStudentDashboard);

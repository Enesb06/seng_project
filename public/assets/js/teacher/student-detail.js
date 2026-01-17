// assets/js/teacher/student-detail.js
import { _supabase } from "../supabaseClient.js";

// URL'den öğrenci ID + class_id al
const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");
const classId = params.get("class_id"); // ✅ yeni

if (!studentId) {
  alert("Student ID not found.");
  throw new Error("Student ID missing");
}

// HTML Elemanları
const nameEl = document.getElementById("studentName");
const emailEl = document.getElementById("email");
const dateEl = document.getElementById("registerDate");
const classEl = document.getElementById("className");

const readCountEl = document.getElementById("readCount");
const wordCountEl = document.getElementById("wordCount");
const quizCountEl = document.getElementById("quizCount");
const avgScoreEl = document.getElementById("avgScore");

const readingArea = document.getElementById("readingArea");
const wordsArea = document.getElementById("wordsArea");
const quizArea = document.getElementById("quizArea");

// --- AVATAR (Header profil resmi) ---
const currentUser = JSON.parse(localStorage.getItem('user') || "null");
if (currentUser && currentUser.avatar_url) {
  const imgEl = document.getElementById('header-avatar');
  if (imgEl) imgEl.src = currentUser.avatar_url;
}

// ======================
// 1. Öğrenci Bilgileri  ✅ MULTI-CLASS FIX
// ======================
async function loadStudentInfo() {
  // Eğer class_id gelmediyse: öğrenciye ait ilk membership'i göster (fallback)
  let query = _supabase
    .from("class_members")
    .select(`
      profiles (
        full_name,
        email,
        created_at
      ),
      classes (
        id,
        class_name
      )
    `)
    .eq("student_id", studentId);

  if (classId) {
    // ✅ en doğru: teacher hangi sınıftan açtıysa o sınıfı getir
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    console.error("Öğrenci bilgisi alınamadı:", error);
    // boş bırakma
    if (nameEl) nameEl.textContent = "-";
    if (emailEl) emailEl.textContent = "-";
    if (dateEl) dateEl.textContent = "-";
    if (classEl) classEl.textContent = "-";
    return;
  }

  nameEl.textContent = data.profiles?.full_name || "-";
  emailEl.textContent = data.profiles?.email || "-";

  if (data.profiles?.created_at) {
    const d = new Date(data.profiles.created_at);
    dateEl.textContent = isNaN(d.getTime()) ? "-" : d.toLocaleDateString("tr-TR");
  } else {
    dateEl.textContent = "-";
  }

  classEl.textContent = data.classes?.class_name || "-";
}

// ======================
// 2. OKUMA GEÇMİŞİ (contents tablosu)
// ======================
async function loadReadingHistory() {
  const { data, error } = await _supabase
    .from("contents")
    .select("id, title, body, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Reading error:", error);
    if (readingArea) readingArea.innerHTML = "<p>Reading history could not be retrieved.</p>";
    if (readCountEl) readCountEl.textContent = "0";
    return;
  }

  if (readCountEl) readCountEl.textContent = (data || []).length;

  if (!data || data.length === 0) {
    if (readingArea) readingArea.innerHTML = "<p>No reading history.</p>";
    return;
  }

  let html = `<table class="report-table"><tbody>`;

  data.forEach(item => {
    html += `
      <tr class="reading-row" data-id="${item.id}">
        <td>${item.title}</td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
      </tr>
      <tr class="reading-content" id="content-${item.id}" style="display:none;">
        <td colspan="2">${item.body}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  if (readingArea) readingArea.innerHTML = html;

  document.querySelectorAll(".reading-row").forEach(row => {
    row.addEventListener("click", () => {
      const content = document.getElementById("content-" + row.dataset.id);
      if (!content) return;
      content.style.display = (content.style.display === "table-row") ? "none" : "table-row";
    });
  });
}

// ======================
// 3. KELİME GELİŞİMİ
// ======================
async function loadWords() {
  const { data, error } = await _supabase
    .from("word_list")
    .select("word, learning_status")
    .eq("student_id", studentId);

  if (error) {
    console.warn("Kelime verisi alınamadı:", error);
    if (wordsArea) wordsArea.innerHTML = "<p>Word data not found.</p>";
    if (wordCountEl) wordCountEl.textContent = "0";
    return;
  }

  if (wordCountEl) wordCountEl.textContent = (data || []).length;

  if (!data || data.length === 0) {
    if (wordsArea) wordsArea.innerHTML = "<p>No words found.</p>";
    return;
  }

  if (wordsArea) {
    wordsArea.innerHTML = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Word</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(data || []).map(w => `
            <tr>
              <td>${w.word}</td>
              <td>
                <span class="${w.learning_status === 'learned' ? 'badge-green' : 'badge-gray'}">
                  ${w.learning_status === 'learned' ? 'Learned' : 'Learning'}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
}

// ======================
// 4. QUIZ SONUÇLARI
// ======================
async function loadQuizResults() {
  const { data, error } = await _supabase
    .from("quiz_results")
    .select("score, total_questions, created_at")
    .eq("student_id", studentId);

  if (error) {
    console.warn("Quiz verisi alınamadı:", error);
    if (quizArea) quizArea.innerHTML = "<p>No quiz data.</p>";
    if (quizCountEl) quizCountEl.textContent = "0";
    if (avgScoreEl) avgScoreEl.textContent = "0";
    return;
  }

  if (quizCountEl) quizCountEl.textContent = (data || []).length;

  const valid = (data || []).filter(q => (q.total_questions || 0) > 0);

  const avg =
    valid.length === 0
      ? 0
      : Math.round(
          (valid.reduce((sum, q) => sum + (q.score / q.total_questions), 0) / valid.length) * 100
        );

  if (avgScoreEl) avgScoreEl.textContent = String(avg);

  if (quizArea) {
    quizArea.innerHTML = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${(data || []).map(q => `
            <tr>
              <td>${new Date(q.created_at).toLocaleDateString()}</td>
              <td>${q.score}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
}

// ======================
// BAŞLAT
// ======================
loadStudentInfo();
loadReadingHistory();
loadWords();
loadQuizResults();

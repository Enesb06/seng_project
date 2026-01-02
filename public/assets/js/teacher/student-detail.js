import { _supabase } from "../supabaseClient.js";

// URL'den öğrenci ID al
const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

if (!studentId) {
  alert("Öğrenci ID bulunamadı.");
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


// ======================
// 1. Öğrenci Bilgileri
// ======================
async function loadStudentInfo() {
  const { data, error } = await _supabase
    .from("class_members")
    .select(`
      profiles (
        full_name,
        email,
        created_at
      ),
      classes (
        class_name
      )
    `)
    .eq("student_id", studentId)
    .single();

  if (error || !data) {
    console.error("Öğrenci bilgisi alınamadı:", error);
    return;
  }

  // AD
  nameEl.textContent = data.profiles?.full_name || "-";

  // EMAIL
  emailEl.textContent = data.profiles?.email || "-";

  // TARİH
  if (data.profiles?.created_at) {
    const d = new Date(data.profiles.created_at);
    dateEl.textContent = isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("tr-TR");
  } else {
    dateEl.textContent = "-";
  }

  // SINIF
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
    readingArea.innerHTML = "<p>Okuma geçmişi alınamadı.</p>";
    return;
  }

  readCountEl.textContent = data.length;

  if (!data.length) {
    readingArea.innerHTML = "<p>Okuma geçmişi yok.</p>";
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
  readingArea.innerHTML = html;

  document.querySelectorAll(".reading-row").forEach(row => {
    row.addEventListener("click", () => {
      const content = document.getElementById("content-" + row.dataset.id);
      content.style.display =
        content.style.display === "table-row" ? "none" : "table-row";
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
    wordsArea.innerHTML = "<p>Kelime verisi bulunamadı.</p>";
    return;
  }

  wordCountEl.textContent = data.length;

  if (!data.length) {
    wordsArea.innerHTML = "<p>Kelime bulunamadı.</p>";
    return;
  }

  wordsArea.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Kelime</th>
          <th>Durum</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(w => `
          <tr>
            <td>${w.word}</td>
            <td>
              <span class="${w.learning_status === 'learned' ? 'badge-green' : 'badge-gray'}">
                ${w.learning_status === 'learned' ? 'Öğrenildi' : 'Öğreniliyor'}
              </span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
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
    quizArea.innerHTML = "<p>Quiz verisi yok.</p>";
    return;
  }

  quizCountEl.textContent = data.length;

 const valid = data.filter(q => q.total_questions > 0);

const avg =
  valid.length === 0
    ? 0
    : Math.round(
        (valid.reduce(
          (sum, q) => sum + (q.score / q.total_questions),
          0
        ) / valid.length) * 100
      );

avgScoreEl.textContent = avg;




  quizArea.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Skor</th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (q) => `
          <tr>
            <td>${new Date(q.created_at).toLocaleDateString()}</td>
            <td>${q.score}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// --- AVATAR (PROFİL RESMİ) GÜNCELLEME ---
const currentUser = JSON.parse(localStorage.getItem('user'));
if (currentUser && currentUser.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if(imgEl) imgEl.src = currentUser.avatar_url;
}


// ======================
// BAŞLAT
// ======================
loadStudentInfo();
loadReadingHistory();
loadWords();
loadQuizResults();
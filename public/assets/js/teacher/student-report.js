// assets/js/teacher/student-report.js
import { _supabase } from "../supabaseClient.js";

const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar'); // sayfanda varsa

const classSelect = document.getElementById("classSelect");
const tableBody = document.getElementById("studentTable");

const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const user = getUser();

// Header avatar (header-avatar id'li img varsa)
if (user && user.avatar_url) {
  const imgEl = document.getElementById('header-avatar');
  if (imgEl) imgEl.src = user.avatar_url;
}

document.addEventListener('DOMContentLoaded', () => {
  const u = getUser();
  if (!u) {
    window.location.href = '../../index.html';
    return;
  }

  if (welcomeMessage) welcomeMessage.innerText = `Welcome, ${u.full_name}!`;

  if (userAvatar && u.avatar_url) userAvatar.src = u.avatar_url;

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = '../../index.html';
    });
  }
});

async function loadClasses() {
  if (!user) {
    console.error("Kullanıcı bulunamadı");
    return;
  }

  const { data, error } = await _supabase
    .from("classes")
    .select("id, class_name")
    .eq("teacher_id", user.id);

  if (error) {
    console.error("Sınıflar alınamadı:", error);
    return;
  }

  classSelect.innerHTML =
    `<option value="">Select class</option>` +
    (data || []).map(c => `<option value="${c.id}">${c.class_name}</option>`).join("");
}

async function loadStudents(classId) {
  if (!classId) return;

  tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
  

  const { data: members, error: memErr } = await _supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId);

  if (memErr) {
    console.error("class_members alınamadı:", memErr);
    tableBody.innerHTML = `<tr><td colspan="3">Error</td></tr>`;
    return;
  }

  if (!members || members.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3">No students</td></tr>`;
    return;
  }

  const ids = members.map(m => m.student_id);

  const { data: students, error: stErr } = await _supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  if (stErr) {
    console.error("profiles alınamadı:", stErr);
    tableBody.innerHTML = `<tr><td colspan="3">Error</td></tr>`;
    return;
  }

  // ✅ EN KRİTİK FIX: linke class_id ekliyoruz
  tableBody.innerHTML = (students || []).map(s => `
    <tr>
      <td>${s.full_name}</td>
      <td>${s.email}</td>
      <td>
        <a href="student-detail.html?id=${s.id}&class_id=${classId}">View Report</a>
      </td>
    </tr>
  `).join("");
}

classSelect.addEventListener("change", e => {
  loadStudents(e.target.value);
});

// Başlat
loadClasses();

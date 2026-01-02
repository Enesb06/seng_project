import { _supabase } from "../supabaseClient.js";

const classSelect = document.getElementById("classSelect");
const tableBody = document.getElementById("studentTable");



async function loadClasses() {
  const user = JSON.parse(localStorage.getItem("user"));

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
    `<option value="">Sınıf seçiniz</option>` +
    data.map(c => `<option value="${c.id}">${c.class_name}</option>`).join("");
}


async function loadStudents(classId) {
  if (!classId) return;

  tableBody.innerHTML = `<tr><td colspan="3">Yükleniyor...</td></tr>`;

  const { data: members } = await _supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId);

  if (!members || members.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3">Öğrenci yok</td></tr>`;
    return;
  }

  const ids = members.map(m => m.student_id);

  const { data: students } = await _supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  tableBody.innerHTML = students.map(s => `
    <tr>
      <td>${s.full_name}</td>
      <td>${s.email}</td>
      <td>
        <a href="student-detail.html?id=${s.id}">Raporu Gör</a>
      </td>
    </tr>
  `).join("");
}

classSelect.addEventListener("change", e => {
  loadStudents(e.target.value);
});

loadClasses();

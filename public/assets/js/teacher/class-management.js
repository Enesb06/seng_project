import { _supabase } from '../supabaseClient.js';

/* =====================
   ELEMENTS & USER
===================== */
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar');

const classSelect = document.getElementById('select-class');              // Assignment
const reportClassSelect = document.getElementById('report-class-select'); // Report
const studentStatusArea = document.getElementById('student-status-area');
const classListDiv = document.getElementById('class-list');

/* 🔵 MY ASSIGNMENTS */
const myAssignmentsClassSelect = document.getElementById('my-assignments-class-select');
const myAssignmentsArea = document.getElementById('my-assignments-area');

const getUser = () => JSON.parse(localStorage.getItem('user'));
const user = getUser();

/* =====================
   DOM READY
===================== */
document.addEventListener('DOMContentLoaded', () => {
    if (!user) {
        window.location.href = '../../index.html';
        return;
    }

    welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
    if (userAvatar && user.avatar_url) userAvatar.src = user.avatar_url;

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });

    loadFormData();
    loadTeacherClasses();
});

/* =====================
   HELPER
===================== */
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* =====================
   LOAD CLASSES
===================== */
async function loadFormData() {
    const { data: classes } = await _supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id);

    classSelect.innerHTML = `<option value="">Select class</option>`;
    reportClassSelect.innerHTML = `<option value="">Select class</option>`;
    myAssignmentsClassSelect.innerHTML = `<option value="">Select class</option>`;

    classes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.class_name} (${c.class_code})`;

        classSelect.appendChild(opt);
        reportClassSelect.appendChild(opt.cloneNode(true));
        myAssignmentsClassSelect.appendChild(opt.cloneNode(true));
    });
}

/* =====================
   CREATE CLASS
===================== */
document.getElementById('create-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    await _supabase.from('classes').insert([{
        teacher_id: user.id,
        class_name: document.getElementById('class-name').value,
        class_code: generateCode()
    }]);

    e.target.reset();
    loadFormData();
    loadTeacherClasses();
});

/* =====================
   ASSIGN HOMEWORK
===================== */
document.getElementById('assign-homework-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    await _supabase.from('assignments').insert([{
        teacher_id: user.id,
        class_id: classSelect.value,
        title: document.getElementById('hw-title').value,
        description: document.getElementById('hw-description').value,
        due_date: document.getElementById('hw-due-date').value
    }]);

    alert("Assignment successfully assigned!");
    e.target.reset();
});

/* =====================
   🔵 MY ASSIGNMENTS (CLASS SELECTION)
===================== */
myAssignmentsClassSelect.addEventListener('change', (e) => {
    const classId = e.target.value;
    if (!classId) {
        myAssignmentsArea.innerHTML = "<p>Please select a class.</p>";
        return;
    }
    loadMyAssignments(classId);
});

async function loadMyAssignments(classId) {
  myAssignmentsArea.innerHTML = "<p>Loading...</p>";

  const { data: assignments, error } = await _supabase
    .from('assignments')
    .select(`
      id,
      title,
      description,
      due_date,
      assignment_completions(student_id),
      classes (
        class_members(student_id)
      )
    `)
    .eq('teacher_id', user.id)
    .eq('class_id', classId)
    .order('created_at', { ascending: true })


  if (error) {
    myAssignmentsArea.innerHTML = "<p>Error loading assignments.</p>";
    return;
  }

  if (!assignments || assignments.length === 0) {
    myAssignmentsArea.innerHTML = "<p>No assignments for this class.</p>";
    return;
  }

  myAssignmentsArea.innerHTML = assignments.map((a, i) => {
    const totalStudents = a.classes?.class_members?.length || 0;
    const completedCount = a.assignment_completions?.length || 0;

    return `
      <div class="teacher-hw-item" data-id="${a.id}">

        <strong>Assignment ${i + 1} — ${a.title}</strong>

        <div class="hw-date">
          📅 Due Date: ${new Date(a.due_date).toLocaleDateString('tr-TR')}
        </div>

        ${a.description ? `
          <div class="hw-desc" style="margin-top:10px;">
            ${a.description}
          </div>
        ` : ``}

        <div style="margin-top:10px;font-size:0.85rem;color:#555;">
          👥 ${completedCount} / ${totalStudents} completed
        </div>

        <div class="hw-actions">
          <button class="edit-hw-btn" title="Edit">✏️</button>
          <button class="delete-hw-btn" title="Delete">🗑️</button>
        </div>

      </div>
    `;
  }).join('');
}



/* Toggle description */
document.addEventListener('click', (e) => {
    const card = e.target.closest('.teacher-hw-item');
    if (!card) return;

    const id = card.dataset.id;
    const desc = document.getElementById(`teacher-desc-${id}`);
    if (!desc) return;

    desc.style.display = desc.style.display === "block" ? "none" : "block";
});

/* =====================
   REPORT SELECT
===================== */
reportClassSelect.addEventListener('change', (e) => {
    const classId = e.target.value;
    if (!classId) {
        studentStatusArea.innerHTML = "<p>Select a class for report.</p>";
        return;
    }
    loadStudentProgress(classId);
});

/* =====================
   STUDENT REPORT (DAY BASED)
===================== */
async function loadStudentProgress(classId) {
    studentStatusArea.innerHTML = "<p>Loading...</p>";

    const { data: students } = await _supabase
        .from("class_members")
        .select(`student_id, users:student_id ( full_name )`)
        .eq("class_id", classId);

    const { data: assignments } = await _supabase
        .from("assignments")
        .select("id, title, description, due_date")
        .eq("class_id", classId);

    const { data: completions } = await _supabase
        .from("assignment_completions")
        .select("assignment_id, student_id, completed_at")
        .in("assignment_id", assignments.map(a => a.id));

    let html = `<table class="report-table"><thead><tr><th>Student</th>`;
    assignments.forEach((a, i) => {
        html += `<th title="${a.description || ''}">Assignment ${i + 1}<br>${a.title}</th>`;
    });
    html += `</tr></thead><tbody>`;

    students.forEach(stu => {
        html += `<tr><td>${stu.users.full_name}</td>`;
        assignments.forEach(a => {
            const c = completions.find(x =>
                x.assignment_id === a.id && x.student_id === stu.student_id
            );

            if (!c) {
                html += `<td>❌ Not completed</td>`;
            } else {
                const due = a.due_date.split('T')[0];
                const done = c.completed_at.split('T')[0];
                html += `<td>${done > due ? '🟠 Late' : '✅ On time'}<br>${new Date(c.completed_at).toLocaleDateString('tr-TR')}</td>`;
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    studentStatusArea.innerHTML = html;
}

/* =====================
   CREATED CLASSES
===================== */
async function loadTeacherClasses() {
    classListDiv.innerHTML = '<li>Loading...</li>';

    const { data: classes } = await _supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id);

    classListDiv.innerHTML = '';
    classes.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.class_name} (${c.class_code})`;
        classListDiv.appendChild(li);
    });
}

document.addEventListener('click', async (e) => {
    const card = e.target.closest('.teacher-hw-item');
    if (!card) return;

    const assignmentId = card.dataset.id;

    /* 🗑 DELETE */
    if (e.target.classList.contains('delete-hw-btn')) {
        if (!confirm("Do you want to delete this assignment?")) return;

        await _supabase
            .from('assignments')
            .delete()
            .eq('id', assignmentId);

        loadMyAssignments(myAssignmentsClassSelect.value);
    }

    /* ✏️ OPEN EDIT */
    if (e.target.classList.contains('edit-hw-btn')) {
        card.querySelector('.edit-area').style.display = 'block';
    }

    /* ❌ CANCEL */
    if (e.target.classList.contains('cancel-hw-btn')) {
        card.querySelector('.edit-area').style.display = 'none';
    }

    /* 💾 SAVE */
    if (e.target.classList.contains('save-hw-btn')) {
        const title = card.querySelector('.edit-title').value;
        const description = card.querySelector('.edit-desc').value;
        const due_date = card.querySelector('.edit-date').value;

        await _supabase
            .from('assignments')
            .update({ title, description, due_date })
            .eq('id', assignmentId);

        alert("Assignment updated ✅");
        loadMyAssignments(myAssignmentsClassSelect.value);
    }
});

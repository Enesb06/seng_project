import { _supabase } from '../supabaseClient.js';

/* ========= ELEMENTLER ========= */
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const totalReadingsStat = document.getElementById('total-readings-stat');
const learnedWordsStat = document.getElementById('learned-words-stat');
const quizSuccessStat = document.getElementById('quiz-success-stat');
const badgeList = document.getElementById('badge-list');
const joinClassBtn = document.getElementById('join-class-btn');
const classCodeInput = document.getElementById('class-code-input');
const joinMessage = document.getElementById('join-message');

/* ========= PANEL ========= */
const loadStudentDashboard = async () => {
    const userString = localStorage.getItem('user');
    if (!userString) {
        window.location.href = '/index.html';
        return;
    }

    const user = JSON.parse(userString);
    if (user.role !== 'student') {
        localStorage.removeItem('user');
        window.location.href = '/index.html';
        return;
    }

    welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
    await loadStats(); // ✅ SADECE BURASI: artık gerçek veri
    loadBadges();
    loadMyClassAndHomework();
};

/* ========= SINIF & ÖDEVLER (GÜN BAZLI) ========= */
const loadMyClassAndHomework = async () => {
    const user = JSON.parse(localStorage.getItem('user'));

    const { data: membership } = await _supabase
        .from('class_members')
        .select('class_id, classes(class_name, class_code)')
        .eq('student_id', user.id)
        .single();

    const classInfoArea = document.getElementById('class-info-area');
    if (!membership) {
        if (classInfoArea)
            classInfoArea.innerHTML = "<p>Henüz bir sınıfa katılmadınız.</p>";
        return;
    }

    if (classInfoArea) {
        classInfoArea.innerHTML = `
            <strong>Sınıf:</strong> ${membership.classes.class_name}
            <small>(Kod: ${membership.classes.class_code})</small>
        `;
    }

    const { data: assignments } = await _supabase
        .from('assignments')
        .select('id, title, description, due_date, assignment_completions(completed_at)')
        .eq('class_id', membership.class_id);

    const hwList = document.getElementById('homework-list');
    if (!hwList) return;

    if (!assignments || assignments.length === 0) {
        hwList.innerHTML = "<p>Bu sınıfa atanmış ödev yok.</p>";
        return;
    }

    hwList.innerHTML = assignments.map(hw => {
        const completion = hw.assignment_completions?.[0];

        const isDone = !!completion;

        let statusHTML = `
            <button class="cta-button read-btn"
                data-id="${hw.id}"
                style="width:auto;padding:5px 12px;">
                Ödevin İçeriğini Oku
            </button>

            <button class="cta-button complete-btn"
                data-id="${hw.id}"
                style="width:auto;padding:5px 12px;background:#16a34a;margin-left:6px;">
                Tamamladım
            </button>
        `;

        if (isDone) {
            const dueDay = new Date(hw.due_date).toISOString().split('T')[0];
            const completedDay = new Date(completion.completed_at).toISOString().split('T')[0];

            const isLate = completedDay > dueDay;

            statusHTML = isLate
                ? '<span style="color:orange;">🟠 Geç Teslim</span>'
                : '<span style="color:green;">✅ Zamanında</span>';
        }

        return `
            <li class="hw-item"
                style="padding:15px;border:1px solid #eee;border-radius:8px;margin-bottom:12px;">

                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h4 style="margin:0;">${hw.title}</h4>
                        <small>Teslim günü: ${new Date(hw.due_date).toLocaleDateString('tr-TR')}</small>
                    </div>

                    <div>${statusHTML}</div>
                </div>

                <div id="content-${hw.id}"
                    style="display:none;margin-top:10px;padding:10px;background:#f9fafb;border-radius:6px;">
                    ${hw.description || "Bu ödev için içerik eklenmemiş."}
                </div>
            </li>
        `;
    }).join('');
};

/* ========= ÖDEV AÇ / KAPAT ========= */
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("read-btn")) {
        const id = e.target.dataset.id;
        const content = document.getElementById(`content-${id}`);
        if (!content) return;

        const open = content.style.display === "block";
        content.style.display = open ? "none" : "block";
        e.target.textContent = open ? "Ödevin İçeriğini Oku" : "Kapat";
    }
});

/* ========= TAMAMLADIM ========= */
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("complete-btn")) {
        const assignmentId = e.target.dataset.id;
        const user = JSON.parse(localStorage.getItem("user"));

        await _supabase.from("assignment_completions").insert({
            assignment_id: assignmentId,
            student_id: user.id,
            completed_at: new Date().toISOString()
        });

        alert("Ödev tamamlandı ✔");
        loadMyClassAndHomework();
    }
});

/* ========= STATİKLER ========= */
const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        // 1) Okuma Sayısı
        const { count: readCount } = await _supabase
            .from('contents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // 2) Öğrenilen Kelime
        const { count: wordCount } = await _supabase
            .from('word_list')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('learning_status', 'learned');

        // 3) Quiz Ortalama
        const { data: quizData } = await _supabase
            .from('quiz_results')
            .select('success_rate')
            .eq('student_id', user.id);

        let avg = 0;
        if (quizData && quizData.length > 0) {
            const total = quizData.reduce((sum, r) => sum + (r.success_rate || 0), 0);
            avg = Math.round(total / quizData.length);
        }

        if (totalReadingsStat) totalReadingsStat.innerText = readCount || 0;
        if (learnedWordsStat) learnedWordsStat.innerText = wordCount || 0;
        if (quizSuccessStat) quizSuccessStat.innerText = `%${avg}`;

    } catch (err) {
        console.error("Ana sayfa istatistikleri çekilemedi:", err);
        if (totalReadingsStat) totalReadingsStat.innerText = '0';
        if (learnedWordsStat) learnedWordsStat.innerText = '0';
        if (quizSuccessStat) quizSuccessStat.innerText = '%0';
    }
};

/* ========= ROZETLER ========= */
const loadBadges = () => {
    const userBadges = [
        { name: 'İlk 10 Kelime', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921148.png' },
        { name: '5. Makale', image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
        { name: 'Quiz Ustası', image: 'https://cdn-icons-png.flaticon.com/512/899/899624.png' }
    ];

    if (!badgeList) return;
    badgeList.innerHTML = '';
    userBadges.forEach(badge => {
        badgeList.innerHTML += `
            <div class="badge">
                <img src="${badge.image}">
                <span>${badge.name}</span>
            </div>
        `;
    });
};

/* ========= SINIFA KATIL ========= */
const handleJoinClass = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const code = classCodeInput.value.trim().toUpperCase();

    if (code.length < 6) {
        showMessage("6 haneli kod girin", "red");
        return;
    }

    const { data: classData } = await _supabase
        .from('classes')
        .select('id, class_name')
        .eq('class_code', code)
        .single();

    if (!classData) {
        showMessage("Geçersiz sınıf kodu", "red");
        return;
    }

    await _supabase.from('class_members').insert({
        class_id: classData.id,
        student_id: user.id
    });

    showMessage(`"${classData.class_name}" sınıfına katıldınız`, "green");
    setTimeout(() => window.location.reload(), 1500);
};

const showMessage = (msg, color) => {
    if (!joinMessage) return;
    joinMessage.textContent = msg;
    joinMessage.style.color = color === "red" ? "#dc2626" : "#16a34a";
};

/* ========= EVENTLER ========= */
if (joinClassBtn) joinClassBtn.addEventListener('click', handleJoinClass);
if (logoutButton)
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

document.addEventListener('DOMContentLoaded', loadStudentDashboard);

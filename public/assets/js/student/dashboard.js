// assets/js/student/dashboard.js
import { _supabase } from '../supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const totalReadingsStat = document.getElementById('total-readings-stat');
const learnedWordsStat = document.getElementById('learned-words-stat');
const quizSuccessStat = document.getElementById('quiz-success-stat');
const badgeList = document.getElementById('badge-list');
const joinClassBtn = document.getElementById('join-class-btn');
const classCodeInput = document.getElementById('class-code-input');
const joinMessage = document.getElementById('join-message');

// --- PANEL YÜKLEME ---
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

    if (welcomeMessage) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;

    // ✅ GÜNCEL: İstatistikleri artık Supabase'den çekiyoruz
    await loadStats();

    // Şimdilik rozetler sabit (istersen bunu da dinamik yaparız)
    loadBadges();

    // Sınıf ve ödevler
    loadMyClassAndHomework();
};

// --- SINIF BİLGİLERİ VE ÖDEVLERİ YÜKLE ---
const loadMyClassAndHomework = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    // 1. Katıldığı sınıfı bul
    const { data: membership, error: membershipError } = await _supabase
        .from('class_members')
        .select('class_id, classes(class_name, class_code)')
        .eq('student_id', user.id)
        .single();

    if (membershipError || !membership) {
        const classInfoArea = document.getElementById('class-info-area');
        if (classInfoArea) {
            classInfoArea.innerHTML = "<p>Henüz bir sınıfa katılmadınız. Kodu kullanarak katılabilirsiniz.</p>";
        }
        return;
    }

    // Öğrenci bir sınıfa katılmışsa sınıf bilgisini göster
    const classInfoArea = document.getElementById('class-info-area');
    if (classInfoArea) {
        classInfoArea.innerHTML = `
            <strong>Sınıf:</strong> ${membership.classes.class_name} 
            <small>(Kod: ${membership.classes.class_code})</small>
        `;
    }

    // 2. Bu sınıfa atanmış ödevleri ve bitirilme durumunu getir
    const { data: assignments, error: assignmentsError } = await _supabase
        .from('assignments')
        .select(`*, assignment_completions(id)`)
        .eq('class_id', membership.class_id);

    if (assignmentsError) {
        console.error("Ödevler çekilirken hata oluştu:", assignmentsError);
        return;
    }

    const hwList = document.getElementById('homework-list');
    if (hwList) {
        if (assignments && assignments.length > 0) {
            hwList.innerHTML = assignments.map(hw => {
                const isDone = hw.assignment_completions && hw.assignment_completions.length > 0;

                return `
                    <li class="hw-item ${isDone ? 'done' : ''}" style="padding:15px; border:1px solid #eee; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="margin:0;">${hw.title}</h4>
                            <small>Bitiş: ${new Date(hw.due_date).toLocaleDateString()}</small>
                        </div>
                        ${isDone
                            ? '<span style="color:green;">✅ Tamamlandı</span>'
                            : `<button onclick="window.location.href='pages/student/reading.html?hw_id=${hw.id}'" class="cta-button" style="width:auto; padding:5px 15px;">Ödevi Oku</button>`}
                    </li>
                `;
            }).join('');
        } else {
            hwList.innerHTML = "<p>Bu sınıfa atanmış aktif bir ödev bulunmuyor.</p>";
        }
    }
};

// --- ✅ İSTATİSTİKLERİ YÜKLE (GÜNCEL / DİNAMİK) ---
const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        // 1) Okuma sayısı (Profildeki gibi)
        const { count: readCount, error: readErr } = await _supabase
            .from('contents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (readErr) throw readErr;
        if (totalReadingsStat) totalReadingsStat.innerText = readCount || 0;

        // 2) Öğrenilen kelime sayısı (Profildeki gibi)
        const { count: wordCount, error: wordErr } = await _supabase
            .from('word_list')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('learning_status', 'learned');

        if (wordErr) throw wordErr;
        if (learnedWordsStat) learnedWordsStat.innerText = wordCount || 0;

        // 3) Quiz başarısı (success_rate ortalaması)
        const { data: quizData, error: quizErr } = await _supabase
            .from('quiz_results')
            .select('success_rate')
            .eq('student_id', user.id);

        if (quizErr) throw quizErr;

        const avg =
            quizData && quizData.length > 0
                ? Math.round(
                    quizData.reduce((sum, r) => sum + (r.success_rate ?? 0), 0) / quizData.length
                )
                : 0;

        if (quizSuccessStat) quizSuccessStat.innerText = `%${avg}`;

    } catch (err) {
        console.error("Dashboard istatistikleri çekilemedi:", err);
        if (totalReadingsStat) totalReadingsStat.innerText = '0';
        if (learnedWordsStat) learnedWordsStat.innerText = '0';
        if (quizSuccessStat) quizSuccessStat.innerText = '%0';
    }
};

// --- ROZETLERİ YÜKLE (ŞİMDİLİK SABİT) ---
const loadBadges = () => {
    const userBadges = [
        { name: 'İlk 10 Kelime', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921148.png' },
        { name: '5. Makale', image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
        { name: 'Quiz Ustası', image: 'https://cdn-icons-png.flaticon.com/512/899/899624.png' }
    ];

    if (badgeList) {
        if (userBadges.length > 0) {
            badgeList.innerHTML = '';
            userBadges.forEach(badge => {
                const badgeElement = document.createElement('div');
                badgeElement.classList.add('badge');
                badgeElement.innerHTML = `<img src="${badge.image}" alt="${badge.name}"><span>${badge.name}</span>`;
                badgeList.appendChild(badgeElement);
            });
        } else {
            badgeList.innerHTML = '<p>Henüz hiç rozet kazanmadın.</p>';
        }
    }
};

// --- SINIFA KATILMA ---
const handleJoinClass = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const code = classCodeInput.value.trim().toUpperCase();

    if (code.length < 6) {
        showMessage("Lütfen 6 haneli kodu tam girin.", "red");
        return;
    }

    joinClassBtn.disabled = true;
    joinClassBtn.textContent = "Kontrol ediliyor...";

    try {
        // 1. ADIM: Sınıf kodunu 'classes' tablosunda ara
        const { data: classData, error: findError } = await _supabase
            .from('classes')
            .select('id, class_name')
            .eq('class_code', code)
            .single();

        if (findError || !classData) {
            throw new Error("Geçersiz sınıf kodu! Lütfen kodu kontrol edin.");
        }

        // 2. ADIM: Öğrenci zaten bu sınıfta mı kontrol et
        const { data: existingMember } = await _supabase
            .from('class_members')
            .select('id')
            .eq('class_id', classData.id)
            .eq('student_id', user.id)
            .single();

        if (existingMember) {
            throw new Error(`Zaten "${classData.class_name}" sınıfına üyesiniz.`);
        }

        // 3. ADIM: 'class_members' tablosuna kayıt ekle
        const { error: joinError } = await _supabase
            .from('class_members')
            .insert({
                class_id: classData.id,
                student_id: user.id
            });

        if (joinError) throw joinError;

        showMessage(`Tebrikler! "${classData.class_name}" sınıfına katıldınız. Sayfa yenileniyor...`, "green");
        classCodeInput.value = "";

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (err) {
        showMessage(err.message, "red");
    } finally {
        joinClassBtn.disabled = false;
        joinClassBtn.textContent = "Sınıfa Katıl";
    }
};

// Mesaj gösterme yardımcı fonksiyonu
const showMessage = (msg, color) => {
    if (joinMessage) {
        joinMessage.textContent = msg;
        joinMessage.style.color = color === "red" ? "#dc2626" : "#16a34a";
        joinMessage.style.display = "block";
        setTimeout(() => { joinMessage.style.display = "none"; }, 5000);
    }
};

// --- ÇIKIŞ YAPMA ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

// --- EVENT LISTENERS ---
if (joinClassBtn) {
    joinClassBtn.addEventListener('click', handleJoinClass);
}

// --- BAŞLANGIÇ ---
document.addEventListener('DOMContentLoaded', loadStudentDashboard);

// Avatar
const userForAvatar = JSON.parse(localStorage.getItem('user'));
if (userForAvatar && userForAvatar.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if (imgEl) imgEl.src = userForAvatar.avatar_url;
}

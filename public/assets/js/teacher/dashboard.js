import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));

// --- YENİ ELEMENT SEÇİMLERİ ---
const classListSummary = document.getElementById('class-list-summary');
const studentListModal = document.getElementById('student-list-modal');
const modalStudentList = document.getElementById('modal-student-list');
const modalClassName = document.getElementById('modal-class-name');
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const headerAvatar = document.getElementById('header-avatar');
const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base"; 
// ------------------------------


// --- SINIF ÖZETİNİ YÜKLE ---
async function loadClassSummary() {
    if (!user) return;
    classListSummary.innerHTML = '<p>Classes are loading...</p>';

    const { data: classes, error } = await _supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('class_name', { ascending: true });

    if (error || !classes || classes.length === 0) {
        classListSummary.innerHTML = '<p>You do not have any active classes yet.</p>';
        return;
    }

    classListSummary.innerHTML = classes.map(cls => `
        <div class="card class-summary-item" data-class-id="${cls.id}" data-class-name="${cls.class_name}" 
             style="padding: 15px; cursor: pointer; border-left: 5px solid #7314c6; margin-bottom: 10px;">
            <h4 style="margin: 0;">${cls.class_name} (${cls.class_code})</h4>
            <small>Click to see students</small>
        </div>
    `).join('');

    // Her sınıfa tıklama dinleyicisi ekle
    document.querySelectorAll('.class-summary-item').forEach(item => {
        item.addEventListener('click', () => {
            const classId = item.dataset.classId;
            const className = item.dataset.className;
            showStudentsInModal(classId, className);
        });
    });
}

// --- ÖĞRENCİ LİSTESİNİ MODALDA GÖSTER ---
async function showStudentsInModal(classId, className) {
    modalClassName.textContent = `${className} Students`;
    modalStudentList.innerHTML = '<p>Loading student list...</p>';
    studentListModal.classList.remove('hidden');

    // 1. Sınıf üyelerini al ve profiles tablosundan isimlerini çek
    const { data: members, error } = await _supabase
        .from('class_members')
        .select(`student_id, profiles:student_id(full_name, email)`) 
        .eq('class_id', classId);
        
    if (error || !members) {
        modalStudentList.innerHTML = '<p>Could not retrieve student list.</p>';
        return;
    }

    if (members.length === 0) {
        modalStudentList.innerHTML = '<p>No students have joined this class yet.</p>';
        return;
    }

    // Listeyi tablo olarak oluştur
    modalStudentList.innerHTML = `
        <table style="width:100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align:left; padding:8px 0; border-bottom:1px solid #eee;">Full Name</th>
                    <th style="text-align:left; padding:8px 0; border-bottom:1px solid #eee;">Email</th>
                </tr>
            </thead>
            <tbody>
                ${members.map(member => `
                    <tr>
                        <td style="padding:4px 0;">${member.profiles.full_name}</td>
                        <td style="padding:4px 0; font-size: 0.9em; color: #555;">${member.profiles.email}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- İLK AÇILIŞ STATİSTİKLERİNİ GÜNCELLE ---
async function updateStats() {
    if (!user) return;
    
    // Aktif Sınıf Sayısı
    const { count: classCount } = await _supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
    
    document.getElementById('total-classes').innerText = classCount || 0;

    // Toplam Öğrenci Sayısı (Öğretmenin sınıflarındaki benzersiz öğrenciler)
    const { data: classes } = await _supabase.from('classes').select('id').eq('teacher_id', user.id);
    const classIds = classes.map(c => c.id);

    if (classIds.length > 0) {
        const { count: studentCount } = await _supabase
            .from('class_members')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds);
        document.getElementById('total-students').innerText = studentCount || 0;
    } else {
        document.getElementById('total-students').innerText = 0;
    }
}


// --- BAŞLATMA VE LOGOUT (GÜNCELLENDİ) ---
function initDashboard() {
    if (!user || user.role !== 'teacher') {
        window.location.href = '/index.html';
        return;
    }
    
    // HEADER BİLGİLERİNİ DOLDURMA
    if (welcomeMessage) {
         welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
    }
    
    if (headerAvatar) {
        const currentAvatar = user.avatar_url || DEFAULT_AVATAR_URL; 
        headerAvatar.src = currentAvatar;
    }

    // Logout Olayı
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = 'index.html'; 
        });
    }

    // Ana verileri yükle
    updateStats();
    loadClassSummary();
}

// initDashboard() çağrısı
initDashboard();
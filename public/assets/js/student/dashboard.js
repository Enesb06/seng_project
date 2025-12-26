// Artık _supabase'e burada gerek yok, çünkü tüm kullanıcı bilgisi localStorage'da
// import { _supabase } from '../supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const mainContent = document.querySelector('.content-area'); 

const totalReadingsStat = document.getElementById('total-readings-stat');
const learnedWordsStat = document.getElementById('learned-words-stat');
const quizSuccessStat = document.getElementById('quiz-success-stat');
const badgeList = document.getElementById('badge-list');

// --- PANEL YÜKLEME ---
const loadStudentDashboard = () => {
    // Oturum bilgisini Supabase yerine localStorage'dan al
    const userString = localStorage.getItem('user');
    
    if (!userString) {
        // Oturum yoksa ana sayfaya yönlendir
        window.location.href = '/index.html'; 
        return; 
    }

    const user = JSON.parse(userString);

    // Rol Kontrolü
    if (user.role !== 'student') { 
        // Yanlış roldeki kullanıcıyı at
        localStorage.removeItem('user');
        window.location.href = '/index.html'; 
        return;
    }

    // BAŞARILI DURUM
    // Veritabanından tekrar çekmeye gerek yok, bilgi zaten localStorage'da var
    welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`; 

    // İstatistikleri yükle (Şimdilik örnek veriler)
    if (totalReadingsStat) totalReadingsStat.innerText = '12';
    if (learnedWordsStat) learnedWordsStat.innerText = '78';
    if (quizSuccessStat) quizSuccessStat.innerText = '%92';
    
    loadBadges();
};

// --- ROZETLERİ YÜKLE (Değişiklik yok) ---
const loadBadges = () => {
    // ... (Kodda değişiklik yok)
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
                badgeElement.innerHTML = `
                    <img src="${badge.image}" alt="${badge.name}">
                    <span>${badge.name}</span>
                `;
                badgeList.appendChild(badgeElement);
            });
        } else {
             badgeList.innerHTML = '<p>Henüz hiç rozet kazanmadın.</p>';
        }
    }
};

// --- ÇIKIŞ YAPMA ---
logoutButton.addEventListener('click', () => {
    // Supabase'den çıkış yapmak yerine localStorage'ı temizle
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// --- BAŞLANGIÇ ---
document.addEventListener('DOMContentLoaded', loadStudentDashboard);
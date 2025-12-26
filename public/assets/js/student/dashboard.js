import { _supabase } from '../supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const mainContent = document.querySelector('.content-area'); // Ana içerik alanını seçiyoruz

// İstatistik ve rozet elementleri
const totalReadingsStat = document.getElementById('total-readings-stat');
const learnedWordsStat = document.getElementById('learned-words-stat');
const quizSuccessStat = document.getElementById('quiz-success-stat');
const badgeList = document.getElementById('badge-list');

// --- PANEL YÜKLEME ---
const loadStudentDashboard = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    
    // Eğer oturum yoksa, muhtemelen router.js zaten ana sayfaya yönlendirmiştir.
    // Ancak yine de burada bir güvenlik kontrolü olarak tutabiliriz.
    if (!session) {
        // Zaten router tarafından yönlendirildiği varsayılabilir,
        // bu yüzden burada ekstra bir yönlendirmeye gerek olmayabilir.
        // Ama yine de güvenli tarafta kalmak için eklenebilir:
        // window.location.href = '/index.html';
        return; 
    }

    // --- PROFİL KONTROLÜ BURADA YAPILACAK ---
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('full_name, role') // Rolü de alalım, belki ileride öğrenci olmayanları engellemek gerekir.
        .eq('id', session.user.id)
        .single();

    // HATA DURUMU: Profil bulunamazsa veya bir hata oluşursa
    if (profileError || !profile) {
        console.error("Profil hatası:", profileError);
        
        // Hoş geldin mesajını hata mesajıyla değiştir
        welcomeMessage.innerText = 'Hesap Hatası!';
        
        // Ana içerik alanını temizle ve hata mesajını göster
        if (mainContent) { // mainContent'in var olduğundan emin ol
            mainContent.innerHTML = `
                <div class="card error-card">
                    <h3>Kullanıcı Profili Bulunamadı</h3>
                    <p>Hesap bilgileriniz alınırken bir sorun oluştu. Bu durum genellikle Supabase'deki 'profiles' tablosu ile kullanıcı kaydınız arasında bir tutarsızlık olduğunda meydana gelir.</p>
                    <p>Lütfen sistem yöneticisi ile iletişime geçin.</p>
                </div>
            `;
        }
        await _supabase.auth.signOut(); // Güvenlik için çıkış yaptır
        window.location.href = '/index.html'; // Ana sayfaya yönlendir
        return; // Fonksiyonun geri kalanını çalıştırmayı durdur
    }

    // BAŞARILI DURUM: Profil varsa devam et
    
    // Rol kontrolü (Ek güvenlik: Bu sayfaya bir öğretmen veya admin gelirse ne olur?)
    if (profile.role !== 'student') {
        // Öğrenci değilse çıkış yaptırıp ana sayfaya at
        await _supabase.auth.signOut();
        window.location.href = '/index.html';
        return;
    }

    // Hoş geldin mesajını yazdır
    welcomeMessage.innerText = `Hoş geldin, ${profile.full_name}!`;

    // İstatistikleri yükle (Şimdilik örnek veriler)
    // TODO: Bu kısımlar gerçek veritabanı tabloları oluşturulunca güncellenecek.
    if (totalReadingsStat) totalReadingsStat.innerText = '12';
    if (learnedWordsStat) learnedWordsStat.innerText = '78';
    if (quizSuccessStat) quizSuccessStat.innerText = '%92';
    
    // Rozetleri yükle
    loadBadges();
};

// --- ROZETLERİ YÜKLE ---
const loadBadges = () => {
    // TODO: Gerçek rozet verilerini veritabanından çek.
    const userBadges = [
        { name: 'İlk 10 Kelime', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921148.png' },
        { name: '5. Makale', image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
        { name: 'Quiz Ustası', image: 'https://cdn-icons-png.flaticon.com/512/899/899624.png' }
    ];

    if (badgeList) { // badgeList'in var olduğundan emin ol
        if (userBadges.length > 0) {
            badgeList.innerHTML = ''; // "Rozet yok" mesajını temizle
            userBadges.forEach(badge => {
                const badgeElement = document.createElement('div');
                badgeElement.classList.add('badge');
                badgeElement.innerHTML = `
                    <img src="${badge.image}" alt="${badge.name}">
                    <span>${badge.name}</span>
                `;
                badgeList.appendChild(badgeElement);
            });
        }
    }
};

// --- ÇIKIŞ YAPMA ---
logoutButton.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    window.location.href = '/index.html';
});

// --- BAŞLANGIÇ ---
loadStudentDashboard();
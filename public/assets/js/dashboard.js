import { _supabase } from './supabaseClient.js';

// HTML elementlerini seçme
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const studentPanel = document.getElementById('student-panel');
const teacherPanel = document.getElementById('teacher-panel');
const adminPanel = document.getElementById('admin-panel');

// Kullanıcı bilgilerini alıp ekrana yazdıran ve paneli gösteren fonksiyon
const loadDashboard = async () => {
    // Aktif oturumu (session) kontrol et
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        // 'profiles' tablosundan kullanıcının bilgilerini çek
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Profil bilgisi alınırken hata:', error);
            welcomeMessage.innerText = 'Profil bilgileri alınamadı.';
        } else if (profile) {
            // Bilgileri ekrana yazdır
            welcomeMessage.innerText = `Hoş geldin, ${profile.full_name}!`;

            // Role göre ilgili paneli göster
            if (profile.role === 'ogrenci') {
                studentPanel.classList.remove('hidden');
            } else if (profile.role === 'ogretmen') {
                teacherPanel.classList.remove('hidden');
            } else if (profile.role === 'admin') {
                adminPanel.classList.remove('hidden');
            }
        }
    } else {
        // Kullanıcı giriş yapmamışsa, giriş sayfasına yönlendir
        window.location.href = 'index.html';
    }
};

// Çıkış yapma işlemi
logoutButton.addEventListener('click', async () => {
    const { error } = await _supabase.auth.signOut();
    if (error) {
        alert('Çıkış yapılırken hata oluştu: ' + error.message);
    } else {
        // Başarıyla çıkış yapıldıktan sonra giriş sayfasına yönlendir
        window.location.href = 'index.html';
    }
});

// Sayfa yüklendiğinde paneli yükle
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
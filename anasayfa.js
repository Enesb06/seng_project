// Supabase istemcisini başlatma
const { createClient } = supabase;
const supabaseUrl = 'https://infmglbngspopnxrjnfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZm1nbGJuZ3Nwb3BueHJqbmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzM5MjQsImV4cCI6MjA4MTU0OTkyNH0.GBzIbFNM6ezxtDAlWpCIMSabhTmXAXOALNrVkpEgS2c';
const _supabase = createClient(supabaseUrl, supabaseKey);

// HTML elementlerini seçme
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');

// Kullanıcı bilgilerini alıp ekrana yazdıran fonksiyon
const loadUserData = async () => {
    // Aktif oturumu (session) kontrol et
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        // Eğer kullanıcı giriş yapmışsa, 'profiles' tablosundan bilgilerini çek
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
            welcomeMessage.innerText = `Hoş geldin, ${profile.full_name}! Rolünüz: ${profile.role}`;
        }
    } else {
        // Eğer kullanıcı giriş yapmamışsa, onu giriş sayfasına geri yönlendir
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

// Sayfa yüklendiğinde kullanıcı bilgilerini yükle
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
});
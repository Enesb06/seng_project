import { _supabase } from './supabaseClient.js';

// --- ELEMENT SEÇİMİ (Değişiklik yok) ---
// ... (element seçim kodlarınız olduğu gibi kalıyor)
const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const authContainer = document.getElementById('auth-container');
const modalOverlay = document.getElementById('modal-overlay');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const forgotPasswordView = document.getElementById('forgot-password-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const showForgotPasswordLink = document.getElementById('show-forgot-password-link');
const backToLoginLink = document.getElementById('back-to-login-link');


// --- MODAL YÖNETİM FONKSİYONLARI (Değişiklik yok) ---
// ... (modal fonksiyonlarınız olduğu gibi kalıyor)
const hideAllAuthViews = () => {
    loginView.classList.add('hidden');
    signupView.classList.add('hidden');
    forgotPasswordView.classList.add('hidden');
};
const openModal = () => {
    authContainer.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};
const closeModal = () => {
    authContainer.classList.add('hidden');
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    hideAllAuthViews();
};
const displayLoginView = () => {
    hideAllAuthViews();
    loginView.classList.remove('hidden');
    openModal();
};
const displaySignupView = () => {
    hideAllAuthViews();
    signupView.classList.remove('hidden');
    openModal();
};
// Şifremi unuttum özelliği artık çalışmayacak
const displayForgotPasswordView = () => {
    alert("Bu özellik şu anda devre dışıdır.");
    // Veya formu yine de gösterebilirsiniz, ancak işlevsiz olacaktır.
    // hideAllAuthViews();
    // forgotPasswordView.classList.remove('hidden');
    // openModal();
};


// --- OLAY DİNLEYİCİLERİ (Değişiklik yok) ---
// ... (olay dinleyicileriniz olduğu gibi kalıyor)
showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
closeAuthBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
showSignupLink.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); displayForgotPasswordView(); });
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });


// --- YENİ VERİTABANI İŞLEMLERİ (AUTH OLMADAN) ---

// 1. Kayıt Olma Formu -> 'profiles' tablosuna direkt ekleme
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { data, error } = await _supabase
        .from('profiles')
        .insert([
            { 
                full_name: fullName, 
                email: email, 
                password: password, // UYARI: Şifre açık metin olarak kaydediliyor!
                role: role 
            }
        ])
        .select()
        .single();


    if (error) {
        if (error.code === '23505') { // Benzersizlik kısıtlaması hatası (email zaten var)
            alert('Bu e-posta adresi zaten kayıtlı.');
        } else {
            alert('Kayıt hatası: ' + error.message);
        }
    } else {
        alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        displayLoginView(); // Kullanıcıyı giriş formuna yönlendir
        signupForm.reset();
    }
});

// 2. Giriş Yapma Formu -> 'profiles' tablosundan kontrol
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // E-posta ve şifre ile kullanıcıyı veritabanında ara
    const { data: user, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password) // UYARI: Şifre açık metin olarak karşılaştırılıyor!
        .single(); // Sadece bir sonuç bekliyoruz

    if (error || !user) {
        alert('Giriş hatası: E-posta veya şifre yanlış.');
    } else {
        // Kullanıcı bulundu! Oturum bilgisini localStorage'a kaydet
        localStorage.setItem('user', JSON.stringify(user));
        // Sayfayı yeniden yükle, aşağıdaki DOMContentLoaded yönlendirmeyi yapacak
        window.location.reload(); 
    }
});

// 3. Şifre Sıfırlama Formu (Artık işlevsiz)
forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Bu özellik şu anda devre dışıdır.');
    closeModal();
});

// 4. Sayfa Yüklendiğinde Oturum Kontrolü ve Yönlendirme
document.addEventListener('DOMContentLoaded', () => {
    // Supabase session yerine localStorage'ı kontrol et
    const userString = localStorage.getItem('user');
    
    if (userString) {
        const user = JSON.parse(userString);
        
        // Kullanıcının rolüne göre yönlendirme yap
        switch (user.role) {
            case 'student': window.location.href = 'student.html'; break;
            case 'teacher': window.location.href = 'teacher.html'; break;
            case 'admin': window.location.href = 'admin.html'; break;
            default: 
                // Tanımsız bir rol varsa güvenlik için oturumu kapat
                localStorage.removeItem('user');
                break;
        }
    }
});
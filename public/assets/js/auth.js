import { _supabase } from './supabaseClient.js';

// --- ELEMENT SEÇİMİ (Değişiklik yok) ---
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
const displayForgotPasswordView = () => {
    alert("Bu özellik şu anda devre dışıdır.");
};


// --- OLAY DİNLEYİCİLERİ (Değişiklik yok) ---
showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
closeAuthBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
showSignupLink.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); displayForgotPasswordView(); });
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });


// --- VERİTABANI İŞLEMLERİ (GÜNCELLENDİ) ---

// 1. Kayıt Olma Formu
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    // --- YENİ: Rol öğretmen ise onaysız (false), öğrenci ise onaylı (true) başlar ---
    const isVerifiedStatus = (role !== 'teacher');

    const { data, error } = await _supabase
        .from('profiles')
        .insert([
            { 
                full_name: fullName, 
                email: email, 
                password: password, 
                role: role,
                is_verified: isVerifiedStatus // Onay durumu eklendi
            }
        ])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { 
            alert('Bu e-posta adresi zaten kayıtlı.');
        } else {
            alert('Kayıt hatası: ' + error.message);
        }
    } else {
        alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        displayLoginView();
        signupForm.reset();
    }
});

// 2. Giriş Yapma Formu
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data: user, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

    if (error || !user) {
        alert('Giriş hatası: E-posta veya şifre yanlış.');
    } else {
        // Oturum bilgisini localStorage'a kaydet
        localStorage.setItem('user', JSON.stringify(user));
        window.location.reload(); 
    }
});

// 3. Şifre Sıfırlama Formu (Değişiklik yok)
forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Bu özellik şu anda devre dışıdır.');
    closeModal();
});

// 4. Sayfa Yüklendiğinde Oturum Kontrolü ve Yönlendirme (GÜNCELLENDİ)
document.addEventListener('DOMContentLoaded', () => {
    const userString = localStorage.getItem('user');
    
    if (userString) {
        const user = JSON.parse(userString);
        
        switch (user.role) {
            case 'student': 
                window.location.href = 'student.html'; 
                break;
            case 'teacher': 
                // --- YENİ: Öğretmen onaylı değilse bekleme sayfasına gönder ---
                if (user.is_verified === false) {
                    window.location.href = 'pages/teacher/pending.html';
                } else {
                    window.location.href = 'teacher.html';
                }
                break;
            case 'admin': 
                window.location.href = 'admin.html'; 
                break;
            default: 
                localStorage.removeItem('user');
                break;
        }
    }
});
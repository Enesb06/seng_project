import { _supabase } from './supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
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

// --- MODAL YÖNETİM FONKSİYONLARI ---
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
    hideAllAuthViews();
    forgotPasswordView.classList.remove('hidden');
    openModal();
};

// --- OLAY DİNLEYİCİLERİ ---
showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
closeAuthBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
showSignupLink.addEventListener('click', (e) => { e.preventDefault(); displaySignupView(); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });
showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); displayForgotPasswordView(); });
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); displayLoginView(); });

// --- SUPABASE İŞLEMLERİ ---

// 1. Kayıt Olma Formu
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { 
                full_name: fullName, 
                role: role 
            }
        }
    });

    if (error) {
        alert('Kayıt hatası: ' + error.message);
    } else {
        alert('Kayıt başarılı! Hesabınızı doğrulamak için e-postanızı kontrol edin.');
        closeModal();
        signupForm.reset();
    }
});

// 2. Giriş Yapma Formu (!!! DEĞİŞTİRİLDİ !!!)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Giriş hatası: ' + error.message);
    } else {
        // Giriş başarılı! Profil kontrolü yapmadan
        // kullanıcıyı doğrudan öğrenci paneline yönlendir.
        // Profil kontrolü o sayfanın kendi JS dosyasında yapılacak.
        window.location.href = '/student.html';
    }
});

// 3. Şifre Sıfırlama Formu
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/common/password-reset.html`,
    });
    if (error) {
        alert('Hata: ' + error.message);
    } else {
        alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        closeModal();
        forgotPasswordForm.reset();
    }
});

// 4. Sayfa Yüklendiğinde Oturum Kontrolü ve Yönlendirme
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            console.error("Profil alınamadı veya hata oluştu, çıkış yapılıyor.", error);
            await _supabase.auth.signOut();
            return;
        }

        switch (profile.role) {
            case 'student': window.location.href = '/student.html'; break;
            case 'teacher': window.location.href = '/teacher.html'; break;
            case 'admin': window.location.href = '/admin.html'; break;
            default: await _supabase.auth.signOut(); break;
        }
    }
});
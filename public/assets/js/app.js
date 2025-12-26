import { _supabase } from './supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');

const authContainer = document.getElementById('auth-container');
const modalOverlay = document.getElementById('modal-overlay');

const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');

// --- MODAL YÖNETİM FONKSİYONLARI ---

// Modal'ı ve arka planı gösterir
const openModal = () => {
    authContainer.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
};

// Modal'ı ve arka planı gizler
const closeModal = () => {
    authContainer.classList.add('hidden');
    modalOverlay.classList.add('hidden');
};

// Sadece giriş yapma formunu gösterir
const displayLoginView = () => {
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
    openModal();
};

// Sadece kayıt olma formunu gösterir
const displaySignupView = () => {
    signupView.classList.remove('hidden');
    loginView.classList.add('hidden');
    openModal();
};


// --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---

// Ana sayfadaki butonlar
showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    displayLoginView();
});

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    displaySignupView();
});

// Modal kapatma butonları
closeAuthBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Formlar arası geçiş linkleri
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    displaySignupView();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    displayLoginView();
});


// --- SUPABASE İŞLEMLERİ ---

// 1. Kayıt Olma Formu
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { error } = await _supabase.auth.signUp({
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
        signupForm.reset(); // Formu temizle
    }
});

// 2. Giriş Yapma Formu
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Giriş hatası: ' + error.message);
    } else {
        // Başarılı girişte dashboard'a yönlendir
        window.location.href = 'dashboard.html';
    }
});

// 3. Sayfa Yüklendiğinde Oturum Kontrolü
document.addEventListener('DOMContentLoaded', async () => {
    // Aktif bir oturum var mı kontrol et
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        // Eğer kullanıcı zaten giriş yapmışsa, doğrudan dashboard'a yönlendir
        window.location.href = 'dashboard.html';
    }
});
import { _supabase } from './supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
// Ana Sayfa Butonları
const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');

// Modal ve Formlar
const authContainer = document.getElementById('auth-container');
const modalOverlay = document.getElementById('modal-overlay');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

// Form İçi Linkler
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// --- MODAL FONKSİYONLARI ---
const openModal = () => {
    authContainer.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
};

const closeModal = () => {
    authContainer.classList.add('hidden');
    modalOverlay.classList.add('hidden');
};

const showLoginView = () => {
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
    openModal();
};

const showSignupView = () => {
    signupView.classList.remove('hidden');
    loginView.classList.add('hidden');
    openModal();
};

// --- EVENT LISTENERS (OLAY DİNLEYİCİLERİ) ---
showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginView();
});

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupView();
});

closeAuthBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Form içindeki linkler için
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupView();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginView();
});

// --- SUPABASE İŞLEMLERİ ---

// Kayıt olma
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    const { error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName, role: role } }
    });

    if (error) {
        alert('Hata: ' + error.message);
    } else {
        alert('Kayıt başarılı! Hesabınızı doğrulamak için e-postanızı kontrol edin.');
        closeModal();
    }
});

// Giriş yapma
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Giriş hatası: ' + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
});

// Oturum kontrolü
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
});
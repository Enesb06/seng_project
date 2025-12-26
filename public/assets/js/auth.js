// Dosya: public/assets/js/auth.js

import { _supabase } from './supabaseClient.js';
import { handleAuthRedirect } from './router.js';

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

// --- MODAL YÖNETİMİ ---
const openModal = () => {
    authContainer.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
};

const closeModal = () => {
    authContainer.classList.add('hidden');
    modalOverlay.classList.add('hidden');
};

const displayLoginView = () => {
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
    openModal();
};

const displaySignupView = () => {
    signupView.classList.remove('hidden');
    loginView.classList.add('hidden');
    openModal();
};

// --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---
if (showLoginBtn) { // Butonların varlığını kontrol et
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        displayLoginView();
    });

    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        displaySignupView();
    });

    closeAuthBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        displaySignupView();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayLoginView();
    });

    // --- SUPABASE İŞLEMLERİ ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('signup-fullname').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        const { error } = await _supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName, role: role } }
        });

        if (error) {
            alert('Hata: ' + error.message);
        } else {
            alert('Kayıt başarılı! Hesabınızı doğrulamak için e-postanızı kontrol edin.');
            closeModal();
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await _supabase.auth.signInWithPassword({ email, password });

        if (error) {
            alert('Giriş hatası: ' + error.message);
        } else {
            // Giriş başarılı, yönlendirme için router'ı çağır
            handleAuthRedirect();
        }
    });
}

// Sayfa yüklendiğinde oturum durumunu kontrol et ve gerekirse yönlendir.
document.addEventListener('DOMContentLoaded', () => {
    handleAuthRedirect();
});
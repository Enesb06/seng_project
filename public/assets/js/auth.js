import { _supabase } from './supabaseClient.js';

// Güvenlik Soruları Listesi (En başa 'Set Later' eklendi)
const SECURITY_QUESTIONS = [
    { value: "none", text: "Set Later (Optional)" },
    { value: "pet", text: "What was your first pet's name?" },
    { value: "city", text: "Which city were you born in?" },
    { value: "mother", text: "Your favourite movie?" },
    { value: "car", text: "Model of your first car?" },
    { value: "book", text: "What was the name of your favourite book as a child?" }
];

// --- YARDIMCI ELEMENT SEÇİCİ (Hata almamak için) ---
const getEl = (id) => document.getElementById(id);

// --- ELEMENT SEÇİMLERİ ---
const showLoginBtn = getEl('show-login-btn');
const showSignupBtn = getEl('show-signup-btn');
const closeAuthBtn = getEl('close-auth-btn');
const authContainer = getEl('auth-container');
const modalOverlay = getEl('modal-overlay');
const loginView = getEl('login-view');
const signupView = getEl('signup-view');
const forgotPasswordView = getEl('forgot-password-view');
const loginForm = getEl('login-form');
const signupForm = getEl('signup-form');
const forgotPasswordForm = getEl('forgot-password-form');
const showSignupLink = getEl('show-signup-link');
const showLoginLink = getEl('show-login-link');
const showForgotPasswordLink = getEl('show-forgot-password-link');
const backToLoginLink = getEl('back-to-login-link');

const securityQuestionSelect = getEl('security-question-select'); 
const securityAnswerInput = getEl('security-answer');

// Şifre sıfırlama elementleri
const forgotQuestionArea = getEl('forgot-question-area');
const forgotQuestionLabel = getEl('forgot-security-question-label');
const forgotSubmitBtn = getEl('forgot-submit-btn');
const newPasswordArea = getEl('new-password-area');
const forgotEmailInput = getEl('forgot-email');
let currentResetUserId = null;

// --- MODAL YÖNETİM FONKSİYONLARI ---
const hideAllAuthViews = () => {
    if (loginView) loginView.classList.add('hidden');
    if (signupView) signupView.classList.add('hidden');
    if (forgotPasswordView) forgotPasswordView.classList.add('hidden');
};

const openModal = () => {
    if (authContainer) authContainer.classList.remove('hidden');
    if (modalOverlay) modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    if (authContainer) authContainer.classList.add('hidden');
    if (modalOverlay) modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    hideAllAuthViews();
};

const displayLoginView = () => {
    hideAllAuthViews();
    if (loginView) loginView.classList.remove('hidden');
    openModal();
};

const displaySignupView = () => {
    hideAllAuthViews();
    fillSecurityQuestionSelect();
    if (signupView) signupView.classList.remove('hidden');
    // Başlangıçta eğer 'none' seçiliyse inputu gizle
    if (securityQuestionSelect && securityQuestionSelect.value === "none") {
        if (securityAnswerInput) securityAnswerInput.style.display = "none";
    }
    openModal();
};

const displayForgotPasswordView = () => {
    hideAllAuthViews();
    if (forgotPasswordForm) forgotPasswordForm.reset();
    if (forgotQuestionArea) forgotQuestionArea.classList.add('hidden');
    if (newPasswordArea) newPasswordArea.classList.add('hidden');
    if (forgotSubmitBtn) forgotSubmitBtn.textContent = 'Continue';
    if (forgotEmailInput) forgotEmailInput.disabled = false;
    currentResetUserId = null;
    if (forgotPasswordView) forgotPasswordView.classList.remove('hidden');
    openModal();
};

const fillSecurityQuestionSelect = () => {
    if (!securityQuestionSelect) return;
    securityQuestionSelect.innerHTML = ''; 
    SECURITY_QUESTIONS.forEach(q => {
        const option = document.createElement('option');
        option.value = q.value;
        option.textContent = q.text;
        securityQuestionSelect.appendChild(option);
    });
};

// --- GÜVENLİK SORUSU DEĞİŞİMİ: DİNAMİK REQUIRED KONTROLÜ ---
if (securityQuestionSelect) {
    securityQuestionSelect.addEventListener('change', (e) => {
        if (securityAnswerInput) {
            if (e.target.value === "none") {
                securityAnswerInput.style.display = "none"; // Gizle
                securityAnswerInput.required = false;      // Zorunluluğu kaldır
                securityAnswerInput.value = "";             // Temizle
            } else {
                securityAnswerInput.style.display = "block"; // Göster
                securityAnswerInput.required = true;       // Zorunlu yap
            }
        }
    });
}

// --- BUTON OLAY DİNLEYİCİLERİ ---
if (showLoginBtn) showLoginBtn.onclick = (e) => { e.preventDefault(); displayLoginView(); };
if (showSignupBtn) showSignupBtn.onclick = (e) => { e.preventDefault(); displaySignupView(); };
if (closeAuthBtn) closeAuthBtn.onclick = closeModal;
if (modalOverlay) modalOverlay.onclick = closeModal;
if (showSignupLink) showSignupLink.onclick = (e) => { e.preventDefault(); displaySignupView(); };
if (showLoginLink) showLoginLink.onclick = (e) => { e.preventDefault(); displayLoginView(); };
if (showForgotPasswordLink) showForgotPasswordLink.onclick = (e) => { e.preventDefault(); displayForgotPasswordView(); };
if (backToLoginLink) backToLoginLink.onclick = (e) => { e.preventDefault(); displayLoginView(); };

// --- VERİTABANI İŞLEMLERİ ---

// 1. Kayıt Olma
if (signupForm) {
    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = getEl('signup-fullname').value;
        const email = getEl('signup-email').value;
        const password = getEl('signup-password').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        
        const securityQuestion = securityQuestionSelect.value;
        const securityAnswer = securityAnswerInput.value;

        // "none" seçildiyse veritabanına null gönder
        let finalQuestion = securityQuestion === "none" ? null : securityQuestion;
        let finalAnswer = securityQuestion === "none" ? null : securityAnswer;

        if (finalQuestion && !finalAnswer) {
            alert('Please provide an answer for your chosen security question!');
            return;
        }

        const isVerifiedStatus = (role !== 'teacher');

        const { data, error } = await _supabase.from('profiles').insert([{ 
            full_name: fullName, 
            email: email, 
            password: password, 
            role: role,
            is_verified: isVerifiedStatus,
            security_question: finalQuestion,
            security_answer: finalAnswer
        }]);

        if (error) {
            alert(error.code === '23505' ? 'Email already registered.' : 'Error: ' + error.message);
        } else {
            alert('Registration successful! You can now log in.');
            displayLoginView();
            signupForm.reset();
        }
    };
}

// 2. Giriş Yapma
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = getEl('login-email').value;
        const password = getEl('login-password').value;

        const { data: user, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !user) {
            alert('Incorrect email or password.');
        } else {
            localStorage.setItem('user', JSON.stringify(user));
            window.location.reload(); 
        }
    };
}

// 3. Şifre Sıfırlama
if (forgotSubmitBtn) {
    forgotSubmitBtn.onclick = async (e) => {
        e.preventDefault();

        if (!currentResetUserId) {
            const email = forgotEmailInput.value;
            const { data: user, error } = await _supabase.from('profiles').select('id, security_question').eq('email', email).single();

            if (error || !user) { alert('Email not found.'); return; }
            if (!user.security_question || user.security_question === 'none') {
                alert('No security question set. Please contact admin.');
                return;
            }

            const qData = SECURITY_QUESTIONS.find(q => q.value === user.security_question);
            currentResetUserId = user.id;
            forgotEmailInput.disabled = true;
            forgotQuestionLabel.textContent = qData.text;
            getEl('forgot-security-question-value').value = user.security_question;
            forgotQuestionArea.classList.remove('hidden');
            forgotSubmitBtn.textContent = 'Verify Answer';

        } else if (!newPasswordArea.classList.contains('hidden')) {
            const newPass = getEl('new-password').value;
            const confirmPass = getEl('confirm-password').value;
            if (newPass !== confirmPass) { alert('Passwords do not match!'); return; }
            
            const { error } = await _supabase.from('profiles').update({ password: newPass }).eq('id', currentResetUserId);
            if (!error) {
                alert('Password updated! You can log in.');
                closeModal();
            }
        } else {
            const ans = getEl('forgot-security-answer').value;
            const qVal = getEl('forgot-security-question-value').value;
            const { data: check } = await _supabase.from('profiles').select('id').eq('id', currentResetUserId).eq('security_question', qVal).eq('security_answer', ans).single();

            if (!check) { alert('Incorrect answer!'); return; }
            newPasswordArea.classList.remove('hidden');
            forgotSubmitBtn.textContent = 'Update Password';
        }
    };
}

// 4. Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    fillSecurityQuestionSelect();
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        if (user.role === 'student') window.location.href = 'student.html';
        else if (user.role === 'teacher') window.location.href = user.is_verified ? 'teacher.html' : 'pages/teacher/pending.html';
        else if (user.role === 'admin') window.location.href = 'admin.html';
    }
});
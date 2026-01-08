import { _supabase } from './supabaseClient.js';


// assets/js/auth.js dosyasının en üstüne ekle

const SECURITY_QUESTIONS = [
    { value: "pet", text: "What was your first pet's name?" },
    { value: "city", text: "Which city were you born in?" },
    { value: "mother", text: "Your favourite movie?" },
    { value: "car", text: "Model of your first car?" },
    { value: "book", text: "What was the name of your favourite book as a child?" }
];


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

// YENİ ELEMAN SEÇİMLERİ (HTML'e göre güncellendi)
const signupQuestionLabel = document.getElementById('signup-security-question-label');
const signupQuestionValue = document.getElementById('security-question-value');
const forgotQuestionArea = document.getElementById('forgot-question-area');
const forgotQuestionLabel = document.getElementById('forgot-security-question-label');
const forgotSubmitBtn = document.getElementById('forgot-submit-btn');
const newPasswordArea = document.getElementById('new-password-area');
const forgotEmailInput = document.getElementById('forgot-email');
let currentResetUserId = null; // Şifre sıfırlama aşamasında kullanıcı ID'sini tutacak


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
    setRandomSecurityQuestion();
    signupView.classList.remove('hidden');
    openModal();
};

const displayForgotPasswordView = () => {
    hideAllAuthViews();
    forgotPasswordForm.reset();
    forgotQuestionArea.classList.add('hidden');
    newPasswordArea.classList.add('hidden');
    forgotSubmitBtn.textContent = 'Devam Et';
    forgotEmailInput.disabled = false;
    currentResetUserId = null;
    forgotPasswordView.classList.remove('hidden');
    openModal();
};

// --- YARDIMCI: RASTGELE SORU SEÇME ---
const setRandomSecurityQuestion = () => {
    if (!signupQuestionLabel || !signupQuestionValue) return;

    const randomIndex = Math.floor(Math.random() * SECURITY_QUESTIONS.length);
    const selectedQuestion = SECURITY_QUESTIONS[randomIndex];

    signupQuestionLabel.textContent = selectedQuestion.text;
    signupQuestionValue.value = selectedQuestion.value;
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


// --- VERİTABANI İŞLEMLERİ ---

// 1. Kayıt Olma Formu
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    const securityQuestion = document.getElementById('security-question-value').value;
    const securityAnswer = document.getElementById('security-answer').value;

    const isVerifiedStatus = (role !== 'teacher');

    const { data, error } = await _supabase
        .from('profiles')
        .insert([
            { 
                full_name: fullName, 
                email: email, 
                password: password, 
                role: role,
                is_verified: isVerifiedStatus,
                security_question: securityQuestion,
                security_answer: securityAnswer
            }
        ])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { 
            alert('This email address is already registered.');
        } else {
            alert('Registration error: ' + error.message);
        }
    } else {
        alert('Registration successful! You can now log in.');
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
        alert('Login error: Email or password is incorrect.');
    } else {
        localStorage.setItem('user', JSON.stringify(user));
        window.location.reload(); 
    }
});


// 🚨 3. Şifre Sıfırlama Butonu (CLICK Olayı - GÜNCELLENDİ)
forgotSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Sayfanın yenilenmesini engelleyen kritik kod

    // AŞAMA 1, 2, 3 MANTIĞI BURAYA TAŞINDI

    if (!currentResetUserId) {
        // --- AŞAMA 1: E-posta kontrolü ---
        const email = forgotEmailInput.value;
        
        if (!email) {
            alert("Please enter your email address.");
            return;
        }

        const { data: user, error } = await _supabase
            .from('profiles')
            .select('id, security_question')
            .eq('email', email)
            .single();

        if (error || !user) {
            alert('This email address is not registered in the system.');
            return;
        }

        const questionData = SECURITY_QUESTIONS.find(q => q.value === user.security_question);
        if (!questionData) {
            alert('Your registered security question could not be found. Please contact the administrator.');
            return;
        }

        // Aşamayı 2'ye geçir
        currentResetUserId = user.id;
        forgotEmailInput.disabled = true;
        forgotQuestionLabel.textContent = questionData.text;
        document.getElementById('forgot-security-question-value').value = user.security_question;
        forgotQuestionArea.classList.remove('hidden');
        forgotSubmitBtn.textContent = 'Answer and Continue';

    } else if (currentResetUserId && !newPasswordArea.classList.contains('hidden')) {
        // --- AŞAMA 3: Şifreyi Güncelleme ---
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        if (newPassword.length < 6) {
             alert('Password must be at least 6 characters long.');
             return;
        }

        const { error: updateError } = await _supabase
            .from('profiles')
            .update({ password: newPassword })
            .eq('id', currentResetUserId);

        if (updateError) {
            alert('An error occurred while updating password: ' + updateError.message);
        } else {
            alert('Your password has been successfully updated! You can now log in.');
            closeModal();
            forgotPasswordForm.reset();
        }

    } else if (currentResetUserId) {
        // --- AŞAMA 2: Güvenlik Sorusunu Kontrol Etme ---
        const answer = document.getElementById('forgot-security-answer').value;
        const question = document.getElementById('forgot-security-question-value').value;
        
        if (!answer) {
             alert('Please answer the security question.');
             return;
        }

        const { data: userCheck, error: checkError } = await _supabase
            .from('profiles')
            .select('id')
            .eq('id', currentResetUserId)
            .eq('security_question', question)
            .eq('security_answer', answer)
            .single();

        if (checkError || !userCheck) {
            alert('Security question answer is incorrect! Please try again.');
            return;
        }

        // Aşamayı 3'e geçir
        newPasswordArea.classList.remove('hidden');
        forgotSubmitBtn.textContent = 'Update Password';
        document.getElementById('forgot-security-answer').disabled = true;

    }
});


// 4. Sayfa Yüklendiğinde Oturum Kontrolü ve Yönlendirme
document.addEventListener('DOMContentLoaded', () => {
    const userString = localStorage.getItem('user');
    
    if (userString) {
        const user = JSON.parse(userString);
        
        switch (user.role) {
            case 'student': 
                window.location.href = 'student.html'; 
                break;
            case 'teacher': 
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
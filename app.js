// Supabase istemcisini başlatma
const { createClient } = supabase;
const supabaseUrl = 'https://infmglbngspopnxrjnfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZm1nbGJuZ3Nwb3BueHJqbmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzM5MjQsImV4cCI6MjA4MTU0OTkyNH0.GBzIbFNM6ezxtDAlWpCIMSabhTmXAXOALNrVkpEgS2c';
const _supabase = createClient(supabaseUrl, supabaseKey);

// HTML elementlerini seçme
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');

// Formları seçme
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

// Görünümler arasında geçiş
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.add('hidden');
    signupView.classList.remove('hidden');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupView.classList.add('hidden');
    loginView.classList.remove('hidden');
});

// Kayıt olma işlemi
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
        alert('Hata: ' + error.message);
    } else {
        // Kayıt sonrası kullanıcıyı bilgilendir
        alert('Kayıt başarılı! Giriş yapabilmek için lütfen e-posta adresinize gönderilen doğrulama linkine tıklayın.');
        // Giriş yapma görünümüne geri dön
        signupView.classList.add('hidden');
        loginView.classList.remove('hidden');
    }
});

// Giriş yapma işlemi
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert('Giriş hatası: ' + error.message);
    } else {
        // Giriş başarılı olduğunda anasayfa.html'e YÖNLENDİR
        window.location.href = 'anasayfa.html';
    }
});

// Sayfa yüklendiğinde oturum kontrolü (opsiyonel ama iyi bir pratik)
// Eğer kullanıcı zaten giriş yapmışsa ve index.html'e gelirse, onu doğrudan ana sayfaya gönder
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        window.location.href = 'anasayfa.html';
    }
});
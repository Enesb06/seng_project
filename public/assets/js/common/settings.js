import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));
let selectedAvatarUrl = user?.avatar_url || "";
let correctSecurityAnswer = ""; 

const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const headerAvatar = document.getElementById('user-avatar'); 
const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base"; 

const updateHeaderAvatar = (url) => {
    if (headerAvatar && url) {
        headerAvatar.src = url;
        headerAvatar.style.display = "block"; 
    }
};

const initSettings = async () => {
    try {
        if (!user) {
            window.location.href = "../../index.html";
            return;
        }

        const currentAvatarUrl = user.avatar_url || DEFAULT_AVATAR_URL; 
        if (welcomeMessage) welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
        if (headerAvatar) headerAvatar.src = currentAvatarUrl;

        // 1. SIDEBAR OLUŞTURMA
        const navUl = document.getElementById('nav-links');
        if (user.role === 'teacher') {
            navUl.innerHTML = `<li><a href="../../teacher.html">Home</a></li><li><a href="../teacher/class-management.html">Management</a></li><li class="active"><a href="settings.html">Settings</a></li>`;
        } else {
            navUl.innerHTML = `<li><a href="../../student.html">Home</a></li><li><a href="../student/profile.html">Profile</a></li><li class="active"><a href="settings.html">Settings</a></li>`;
        }

        // 2. FORM DOLDURMA
        document.getElementById('settings-fullname').value = user.full_name || "";
        document.getElementById('settings-email').value = user.email || "";

        // 3. GÜVENLİK SORUSU KONTROLÜ
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('security_question, security_answer')
            .eq('id', user.id)
            .single();

        const displayLabel = document.getElementById('display-security-question');
        const setupSelect = document.getElementById('setup-security-question');

        if (!error && profile) {
            correctSecurityAnswer = profile.security_answer;

            if (!profile.security_question) {
                // SORU YOKSA: Seçim kutusunu göster
                displayLabel.classList.add('hidden');
                setupSelect.classList.remove('hidden');
            } else {
                // SORU VARSA: Soruyu yazdır
                const questionMap = {
                    "pet": "What was your first pet's name?",
                    "city": "Which city were you born in?",
                    "mother": "Your favourite movie?",
                    "car": "Model of your first car?",
                    "book": "What was the name of your favourite book as a child?"
                };
                displayLabel.textContent = questionMap[profile.security_question];
                setupSelect.classList.add('hidden');
            }
        }

        // 4. AVATAR SEÇİMİ
        const options = document.querySelectorAll('.avatar-option');
        options.forEach(opt => {
            if (opt.dataset.url === user.avatar_url) opt.classList.add('selected');
            opt.onclick = () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedAvatarUrl = opt.dataset.url;
            }
        });

    } catch (e) { console.error("Hata:", e); }
};

const showMsg = (text, isError = false) => {
    const el = document.getElementById('settings-message');
    if (el) {
        el.textContent = text;
        el.style.color = isError ? "#e74c3c" : "#2ecc71";
        setTimeout(() => el.textContent = "", 4000);
    }
};

// Profil Güncelle
document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById('settings-fullname').value.trim();
    const { error } = await _supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);
    if (!error) { user.full_name = newName; localStorage.setItem('user', JSON.stringify(user)); showMsg("Name updated."); }
};

// Avatar Kaydet
document.getElementById('save-avatar-btn').onclick = async () => {
    const { error } = await _supabase.from('profiles').update({ avatar_url: selectedAvatarUrl }).eq('id', user.id);
    if (!error) { user.avatar_url = selectedAvatarUrl; localStorage.setItem('user', JSON.stringify(user)); updateHeaderAvatar(selectedAvatarUrl); showMsg("Avatar changed."); }
};

// Şifre ve Güvenlik Sorusu Güncelle (Kilit Çözücü Kısım)
document.getElementById('password-form').onsubmit = async (e) => {
    e.preventDefault();
    const typedAnswer = document.getElementById('settings-security-answer').value.trim();
    const setupQuestion = document.getElementById('setup-security-question').value;
    const pass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    // Eğer soru yoksa ve seçim de yapılmadıysa hata ver
    if (!correctSecurityAnswer && !setupQuestion) {
        showMsg("Please select a security question first!", true);
        return;
    }

    // Mevcut soru varsa cevap kontrolü yap
    if (correctSecurityAnswer && typedAnswer.toLowerCase() !== correctSecurityAnswer.toLowerCase()) {
        showMsg("Security question answer is incorrect!", true);
        return;
    }

    if (pass !== confirm) { showMsg("Passwords do not match!", true); return; }
    if (pass.length < 6) { showMsg("Password must be at least 6 characters!", true); return; }

    // Güncelleme paketini hazırla
    const updateData = { password: pass };
    if (setupQuestion) {
        updateData.security_question = setupQuestion;
        updateData.security_answer = typedAnswer;
    }

    const { error } = await _supabase.from('profiles').update(updateData).eq('id', user.id);
    if (!error) {
        showMsg("Updated successfully!");
        location.reload(); // Bilgilerin tazelenmesi için
    } else {
        showMsg("Error: " + error.message, true);
    }
};

document.getElementById('logout-button').onclick = () => { localStorage.removeItem('user'); window.location.href = "../../index.html"; };

initSettings();
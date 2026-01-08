import { _supabase } from '../supabaseClient.js';

const user = JSON.parse(localStorage.getItem('user'));
let selectedAvatarUrl = user?.avatar_url || "";
let correctSecurityAnswer = ""; 

const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
// 🚨 DÜZELTİLDİ: HTML'de "user-avatar" veya "header-avatar" ID'si hangisiyse o seçilmeli.
// HTML'de sadece user-avatar var, onu kullanıyoruz.
const headerAvatar = document.getElementById('user-avatar'); 
const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base"; 


// Üst bar resmini güncelleyen yardımcı fonksiyon
const updateHeaderAvatar = (url) => {
    // 🚨 DÜZELTİLDİ: headerAvatar kullanılıyor
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

        // --- HEADER BİLGİLERİNİ DOLDUR ---
        const currentAvatarUrl = user.avatar_url || DEFAULT_AVATAR_URL; 
        
        if (welcomeMessage) welcomeMessage.innerText = `Hoş geldin, ${user.full_name}!`;
        if (headerAvatar) {
            headerAvatar.src = currentAvatarUrl;
        }
        // ------------------------------------------

        // 1. SIDEBAR OLUŞTURMA
        const navUl = document.getElementById('nav-links');
        if (user.role === 'teacher') {
            navUl.innerHTML = `
                <li><a href="../../teacher.html">Anasayfa</a></li>
                <li><a href="../teacher/class-management.html">Sınıf & Ödev Yönetimi</a></li>
                <li><a href="../teacher/student-report.html">Öğrenci Raporları</a></li>
                <li><a href="../teacher/support.html">💬 Destek</a></li>
                <li class="active"><a href="settings.html">⚙️ Ayarlar</a></li>
            `;
        } else {
            navUl.innerHTML = `
                <li><a href="../../student.html">🏠 Ana Sayfa</a></li>
                <li><a href="../student/reading.html">📚 Okuma Materyalleri</a></li>
                <li><a href="../student/favorites.html">⭐ Favorilerim</a></li>
                <li><a href="../student/wordlist.html">📝 Kelime Listem</a></li>
                <li><a href="../student/quiz.html">🧠 Quiz'lerim</a></li>
                <li><a href="../student/ai-chat.html">🤖 AI Asistan</a></li>
                <li><a href="../student/support.html">💬 Destek</a></li>
                <li><a href="../student/profile.html">📊 Profilim & İstatistikler</a></li>
                <li class="active"><a href="settings.html">⚙️ Ayarlar</a></li>
            `;
        }

        // 2. FORM DOLDURMA (Aynı kalır)
        document.getElementById('settings-fullname').value = user.full_name || "";
        document.getElementById('settings-email').value = user.email || "";

        // 3. GÜVENLİK SORUSUNU ÇEK (Aynı kalır)
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('security_question, security_answer')
            .eq('id', user.id)
            .single();

        if (!error && profile) {
            const questionMap = {
                "pet": "What was your first pet's name?",
                "city": "Which city were you born in?",
                "mother": "Your favourite movie?",
                "car": "Model of your first car?",
                "book": "What was the name of your favourite book as a child?"
            };
            
            const questionLabel = questionMap[profile.security_question] || "Güvenlik sorusu bulunamadı.";
            document.getElementById('display-security-question').textContent = questionLabel;
            correctSecurityAnswer = profile.security_answer;
        }

        // 4. AVATAR SEÇİMİ (UI) - GÜNCELLENDİ
        const avatarPicker = document.getElementById('avatar-picker');
        
        // 🚨 HTML'de olmayan default avatarı ekle (Eğer HTML'de eksikse)
        // Eğer HTML'de ilk görsel default görsel değilse bu satırı eklemeliyiz.
        const defaultAvatarExists = avatarPicker.querySelector(`[data-url="${DEFAULT_AVATAR_URL}"]`);
        
        if (!defaultAvatarExists) {
             const defaultOpt = document.createElement('img');
             defaultOpt.className = 'avatar-option';
             defaultOpt.src = DEFAULT_AVATAR_URL;
             defaultOpt.dataset.url = DEFAULT_AVATAR_URL;
             // Listenin başına eklemek için
             avatarPicker.prepend(defaultOpt); 
        }

        const options = document.querySelectorAll('.avatar-option');
        
        options.forEach(opt => {
            const isDefault = opt.dataset.url === DEFAULT_AVATAR_URL;
            
            // Eğer kullanıcının avatarı seçenekteki url ise VEYA user.avatar_url boş ve bu seçenek default ise seçili yap
            if (opt.dataset.url === user.avatar_url || (!user.avatar_url && isDefault)) {
                 opt.classList.add('selected');
                 selectedAvatarUrl = opt.dataset.url;
            }

            opt.onclick = () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedAvatarUrl = opt.dataset.url;
            }
        });
        // ------------------------------------------

    } catch (e) { console.error("Hata:", e); }
};

// Bildirim Mesajı (Aynı kalır)
const showMsg = (text, isError = false) => {
    const el = document.getElementById('settings-message');
    if (el) {
        el.textContent = text;
        el.style.color = isError ? "#e74c3c" : "#2ecc71";
        setTimeout(() => el.textContent = "", 4000);
    }
};

// BUTON OLAYLARI (Aynı kalır)

// Profil Güncelle
document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById('settings-fullname').value.trim();
    const { error } = await _supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);
    if (!error) {
        user.full_name = newName;
        localStorage.setItem('user', JSON.stringify(user));
        showMsg("İsim güncellendi.");
    } else {
        showMsg("Hata: " + error.message, true);
    }
};

// Avatar Kaydet
document.getElementById('save-avatar-btn').onclick = async () => {
    const { error } = await _supabase.from('profiles').update({ avatar_url: selectedAvatarUrl }).eq('id', user.id);
    
    if (error) {
        showMsg("Hata: " + error.message, true);
    } else {
        user.avatar_url = selectedAvatarUrl;
        localStorage.setItem('user', JSON.stringify(user));
        updateHeaderAvatar(selectedAvatarUrl); 
        showMsg("Avatar başarıyla değiştirildi.");
    }
};

// Şifre Güncelle
document.getElementById('password-form').onsubmit = async (e) => {
    e.preventDefault();
    const typedAnswer = document.getElementById('settings-security-answer').value.trim();
    const pass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (typedAnswer.toLowerCase() !== correctSecurityAnswer.toLowerCase()) {
        showMsg("Güvenlik sorusunun cevabı yanlış!", true);
        return;
    }
    if (pass !== confirm) { showMsg("Şifreler eşleşmiyor!", true); return; }
    if (pass.length < 6) { showMsg("Şifre en az 6 karakter olmalı!", true); return; }

    const { error } = await _supabase.from('profiles').update({ password: pass }).eq('id', user.id);
    if (!error) {
        showMsg("Şifre başarıyla değiştirildi.");
        e.target.reset();
    } else {
        showMsg("Hata: " + error.message, true);
    }
};

// Çıkış
document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user');
    window.location.href = "../../index.html";
};

// Başlatıcıyı çalıştır
initSettings();
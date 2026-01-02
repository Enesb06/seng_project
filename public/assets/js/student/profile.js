import { _supabase } from '../supabaseClient.js';

const getUser = () => JSON.parse(localStorage.getItem('user'));

const initializeProfile = async () => {
    const user = getUser();
    if (!user) return;

    // 1. Kişisel Bilgiler
    document.getElementById('profile-name').textContent = user.full_name;
    document.getElementById('profile-email').textContent = user.email;

    try {
        // 2. Okuma Sayısı
        const { count: readCount } = await _supabase
            .from('contents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        document.getElementById('stat-readings').textContent = readCount || 0;

        // 3. Öğrenilen Kelime Sayısı (learning_status = 'learned')
        const { count: wordCount } = await _supabase
            .from('word_list')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('learning_status', 'learned');
        document.getElementById('stat-words').textContent = wordCount || 0;

        // 4. Quiz Geçmişi ve Ortalama
        const { data: quizData, error } = await _supabase
            .from('quiz_results')
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });

        if (quizData && quizData.length > 0) {
            let totalRate = 0;
            const historyBody = document.getElementById('quiz-history-body');
            historyBody.innerHTML = '';

            quizData.forEach(res => {
                totalRate += res.success_rate;
                const date = new Date(res.created_at).toLocaleDateString('tr-TR');
                historyBody.innerHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${res.score}</td>
                        <td>${res.total_questions}</td>
                        <td><strong>%${res.success_rate}</strong></td>
                    </tr>
                `;
            });

            const avg = Math.round(totalRate / quizData.length);
            document.getElementById('stat-quiz-avg').textContent = `%${avg}`;
            
            // Rozetleri Hesapla
            calculateBadges(readCount, wordCount, avg, quizData.length);
        } else {
            document.getElementById('quiz-history-body').innerHTML = '<tr><td colspan="4">Henüz quiz çözülmemiş.</td></tr>';
        }

    } catch (err) {
        console.error("Profil verileri çekilemedi:", err);
    }
};

// --- ROZET MANTIĞI ---
const calculateBadges = (reads, words, avg, quizTotal) => {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';

    const badgeRules = [
        { condition: reads >= 1, icon: '📖', name: 'İlk Okuma' },
        { condition: reads >= 5, icon: '📚', name: 'Kitap Kurdu' },
        { condition: words >= 10, icon: '💡', name: 'Kelime Avcısı' },
        { condition: words >= 50, icon: '🧠', name: 'Kelime Ustası' },
        { condition: quizTotal >= 5, icon: '🎯', name: 'Sınav Müdavimi' },
        { condition: avg >= 80 && quizTotal >= 3, icon: '🏆', name: 'Şampiyon' }
    ];

    badgeRules.forEach(badge => {
        if (badge.condition) {
            container.innerHTML += `
                <div class="badge-item">
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                </div>
            `;
        }
    });

    if (container.innerHTML === '') {
        container.innerHTML = '<p>Gelişim gösterdikçe rozet kazanacaksın!</p>';
    }
};

document.addEventListener('DOMContentLoaded', initializeProfile);

// Çıkış Butonu
document.getElementById('logout-button').onclick = () => {
    localStorage.removeItem('user');
    window.location.href = '../../index.html';
};
const userAvatar = JSON.parse(localStorage.getItem('user'));
if (userAvatar && userAvatar.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if(imgEl) imgEl.src = userAvatar.avatar_url;
}
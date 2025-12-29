import { _supabase } from '../supabaseClient.js';

// --- ELEMENT SEÇİMİ ---
const startBtn = document.getElementById('start-quiz-btn');
const quizIntro = document.getElementById('quiz-intro');
const quizContainer = document.getElementById('quiz-container');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const loader = document.getElementById('loader');
const resultArea = document.getElementById('result-area');
const scoreText = document.getElementById('score-text');
const progressText = document.getElementById('quiz-progress');

// --- DEĞİŞKENLER ---
let currentQuestions = [];
let currentIndex = 0;
let score = 0;

// Bu URL'yi Supabase Dashboard -> Edge Functions kısmından teyit et
const QUIZ_API_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-quiz';

const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- YARDIMCI: JSON TEMİZLEME ---
const parseQuizJSON = (text) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Quiz JSON Parse Hatası:", text);
        throw new Error("AI geçerli bir quiz formatı oluşturamadı.");
    }
};

// --- YENİ: GİRİŞ METNİNİ DİNAMİK GÜNCELLEME ---
const updateIntroText = async () => {
    const user = getUser();
    if (!user) return;

    const infoText = document.getElementById('quiz-info-text');
    if (!infoText) return;

    try {
        // 'learning' durumundaki kelimelerin sayısını alıyoruz
        const { count, error } = await _supabase
            .from('word_list')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('learning_status', 'learning');

        if (error) throw error;

        const wordCount = count || 0;
        const quizCount = Math.min(wordCount, 20); // Max 20 kuralı

        if (wordCount < 3) {
            infoText.innerHTML = `<span style="color: #dc2626;">Listenizde sadece ${wordCount} kelime var. Quiz için en az 3 kelime lazım.</span>`;
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
        } else {
            infoText.textContent = `Listenizdeki "Öğreniyorum" durumundaki kelimelerden ${quizCount} soruluk bir test oluşturulacak.`;
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
        }
    } catch (err) {
        console.error("Kelime sayısı alınamadı:", err);
    }
};

// --- 1. KELİMELERİ ÇEK VE AI'YE GÖNDER ---
const handleStartQuiz = async () => {
    const user = getUser();
    if (!user) return;

    quizIntro.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    loader.classList.remove('hidden');
    document.getElementById('question-area').classList.add('hidden');
    resultArea.classList.add('hidden');

    try {
        const { data: words, error: dbError } = await _supabase
            .from('word_list')
            .select('word, definition')
            .eq('student_id', user.id)
            .eq('learning_status', 'learning')
            .limit(20); 

        if (dbError) throw dbError;

        if (!words || words.length < 3) {
            throw new Error("Quiz için en az 3 kelime lazım. Şu anki kelime sayın: " + (words ? words.length : 0));
        }

        loader.textContent = `${words.length} kelimelik quiz hazırlanıyor...`;

        const response = await fetch(QUIZ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words }) 
        });

        const responseData = await response.json();

        if (!response.ok) throw new Error(responseData.error || "Sunucu hatası.");

        if (!responseData.candidates || !responseData.candidates[0].content?.parts[0]?.text) {
            throw new Error("API'den geçerli içerik gelmedi.");
        }

        const rawText = responseData.candidates[0].content.parts[0].text;
        const quizData = parseQuizJSON(rawText);

        if (quizData.quiz && Array.isArray(quizData.quiz)) {
            currentQuestions = quizData.quiz;
            currentIndex = 0;
            score = 0;
            showQuestion();
        }

    } catch (error) {
        console.error("Hata:", error);
        alert(error.message);
        location.reload();
    } finally {
        loader.classList.add('hidden');
        document.getElementById('question-area').classList.remove('hidden');
    }
};

// --- 2. SORUYU EKRANA BAS ---
const showQuestion = () => {
    if (currentIndex >= currentQuestions.length) {
        showResults();
        return;
    }

    const q = currentQuestions[currentIndex];
    questionText.textContent = q.question;
    progressText.textContent = `Soru ${currentIndex + 1} / ${currentQuestions.length}`;
    
    optionsContainer.innerHTML = '';
    
    q.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; 
        btn.textContent = option;
        btn.onclick = () => handleAnswerClick(index);
        optionsContainer.appendChild(btn);
    });
};

// --- 3. CEVAP KONTROLÜ ---
const handleAnswerClick = (selectedIndex) => {
    const correctIdx = currentQuestions[currentIndex].correctIndex;
    
    if (selectedIndex === correctIdx) {
        score++;
        alert("Doğru! 🎉");
    } else {
        const correctText = currentQuestions[currentIndex].options[correctIdx];
        alert(`Yanlış! ❌ Doğru cevap şuydu: ${correctText}`);
    }
    
    currentIndex++;
    showQuestion();
};

// --- 4. SONUCU GÖSTER VE VERİTABANINA KAYDET ---
const showResults = async () => {
    const user = getUser();
    if (!user) return;

    quizContainer.classList.add('hidden');
    resultArea.classList.remove('hidden');
    
    const total = currentQuestions.length;
    const percentage = Math.round((score / total) * 100);
    
    scoreText.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 10px;">${score} / ${total}</div>
        <div>Başarı Oranın: %${percentage}</div>
        <p id="save-status" style="font-size: 0.9rem; color: #64748b;">Sonuç kaydediliyor...</p>
    `;

    try {
        const { error } = await _supabase
            .from('quiz_results') 
            .insert({
                student_id: user.id,      
                score: score,             
                total_questions: total,   
                success_rate: percentage  
            });

        if (error) throw error;

        document.getElementById('save-status').textContent = "✅ Sonuç başarıyla kaydedildi.";
        document.getElementById('save-status').style.color = "#16a34a";

    } catch (err) {
        console.error("Sonuç kaydedilemedi:", err);
        document.getElementById('save-status').textContent = "❌ Sonuç kaydedilirken bir hata oluştu.";
        document.getElementById('save-status').style.color = "#dc2626";
    }
};

// --- EVENT LISTENERS ---
startBtn.addEventListener('click', handleStartQuiz);

const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
}

// Karşılama mesajı ve Dinamik Yazı Başlatma
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user) {
        const welcomeEl = document.getElementById('welcome-message');
        if (welcomeEl) welcomeEl.innerText = `Hoş geldin, ${user.full_name}!`;
        
        // Dinamik yazıyı güncelle
        updateIntroText();
    }
});
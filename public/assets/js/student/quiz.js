// quiz.js dosyasının güncellenmiş ve tam hali

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
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');

// --- DEĞİŞKENLER ---
let currentQuestions = [];
let currentIndex = 0;
let score = 0;

const QUIZ_API_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-quiz';
const getUser = () => JSON.parse(localStorage.getItem('user'));

// --- YARDIMCI: JSON TEMİZLEME ---
const parseQuizJSON = (text) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Quiz JSON Parse Error:", text);
        throw new Error("AI could not create a valid quiz format.");
    }
};

// --- GİRİŞ METNİNİ DİNAMİK GÜNCELLEME ---
const updateIntroText = async () => {
    const user = getUser();
    if (!user) return;

    const infoText = document.getElementById('quiz-info-text');
    if (!infoText) return;

    try {
        // Yeni mantığa göre tekrarı gelen kelimeleri say
        const today = new Date().toISOString();
        const { count, error } = await _supabase
            .from('word_list')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('learning_status', 'learning')
            .or(`next_quiz_date.is.null,next_quiz_date.lte.${today}`);

        if (error) throw error;

        const wordCount = count || 0;
        
        // Quiz için uygun kelime sayısını da yeni mantıkla hesaplayabiliriz.
        const quizCount = Math.min(wordCount, 10); // Quiz'i 10 soruyla sınırlayalım.

        if (wordCount < 3) {
            infoText.innerHTML = `<span style="color: #dc2626;">Your list needs at least 3 words due for review. You have ${wordCount}.</span>`;
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
        } else {
            infoText.textContent = `A test with up to ${quizCount} questions will be created from your words due for review.`;
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
        }
    } catch (err) {
        console.error("Word count could not be retrieved:", err);
    }
};

// --- 1. AKILLI KELİME SEÇİMİ VE QUIZ BAŞLATMA (handleStartQuiz) ---
const handleStartQuiz = async () => {
    const user = getUser();
    if (!user) return;

    quizIntro.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    loader.classList.remove('hidden');
    document.getElementById('question-area').classList.add('hidden');
    resultArea.classList.add('hidden');

    try {
        // YENİ MANTIK:
        // 1. "learning" durumunda olan VE
        // 2. 'next_quiz_date' bugünden önce olan VEYA hiç quiz'e girmemiş (NULL) kelimeleri çek.
        const today = new Date().toISOString();
        const { data: words, error: dbError } = await _supabase
            .from('word_list')
            .select('id, word, definition, quiz_streak') // ID ve streak'i de alıyoruz!
            .eq('student_id', user.id)
            .eq('learning_status', 'learning')
            .or(`next_quiz_date.is.null,next_quiz_date.lte.${today}`) // Burası sihirli kısım!
            .limit(10); // Her quiz'de en fazla 10 kelime soralım

        if (dbError) throw dbError;

        if (!words || words.length < 3) {
            // Eğer yeterli kelime yoksa kullanıcıyı bilgilendir
            alert("There are not enough words to review right now. Please add new words or wait for the review time.");
            location.reload();
            return;
        }

        loader.textContent = `Preparing quiz with ${words.length} words...`;

        // AI'ye gönderilecek veri formatı (sadece kelime ve anlam)
        const wordsForAI = words.map(w => ({ word: w.word, definition: w.definition }));

        const response = await fetch(QUIZ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: wordsForAI })
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || "Server error.");

        const rawText = responseData.candidates[0].content.parts[0].text;
        const quizData = parseQuizJSON(rawText);

        if (quizData.quiz && Array.isArray(quizData.quiz)) {
            // Gelen quiz sorularını orjinal kelime verileriyle (id, streak vb.) eşleştiriyoruz.
            currentQuestions = quizData.quiz.map((q, index) => ({
                ...q,
                wordData: words[index] // Her soruya ilgili kelimenin tüm bilgisini ekle
            }));
            
            currentIndex = 0;
            score = 0;
            showQuestion();
        }

    } catch (error) {
        console.error("Error:", error);
        alert(error.message);
        location.reload();
    } finally {
        loader.classList.add('hidden');
        document.getElementById('question-area').classList.remove('hidden');
    }
};

// --- 2. SORUYU GÖSTERME (showQuestion) ---
const showQuestion = () => {
    if (currentIndex >= currentQuestions.length) {
        showResults();
        return;
    }
 
    const q = currentQuestions[currentIndex];
    questionText.textContent = q.question;
    progressText.textContent = `Question ${currentIndex + 1} / ${currentQuestions.length}`;
    
    optionsContainer.innerHTML = '';
    
    q.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => handleAnswerClick(index);
        optionsContainer.appendChild(btn);
    });
};


// --- YARDIMCI: SONRAKİ QUIZ TARİHİNİ HESAPLAMA ---
const calculateNextQuizDate = (streak) => {
    const date = new Date();
    let daysToAdd = 0;
    switch (streak) {
        case 1: daysToAdd = 1; break;  // 1 gün sonra
        case 2: daysToAdd = 3; break;  // 3 gün sonra
        case 3: daysToAdd = 7; break;  // 1 hafta sonra
        default: daysToAdd = 1; break; // Yanlış bilinirse veya ilk doğruysa ertesi gün
    }
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString();
};


// --- 3. CEVAP KONTROLÜ VE VERİTABANI GÜNCELLEME (handleAnswerClick) ---
const handleAnswerClick = (selectedIndex) => {
    const currentQuestion = currentQuestions[currentIndex];
    const correctIdx = currentQuestion.correctIndex;
    const wordInfo = currentQuestion.wordData; // Kelimenin tüm veritabanı bilgisi
    
    const isCorrect = selectedIndex === correctIdx;

    if (isCorrect) {
        score++;
    }

    // Kelime durumunu veritabanında ASENKRON olarak güncelle
    updateWordQuizStats(wordInfo, isCorrect);

    // Modal'ı göster
    showFeedbackModal(isCorrect);
};

// --- YENİ FONKSİYON: KELİME İSTATİSTİKLERİNİ GÜNCELLEME ---
const updateWordQuizStats = async (word, isCorrect) => {
    let newStreak = word.quiz_streak;
    let newStatus = 'learning';

    if (isCorrect) {
        newStreak++;
    } else {
        newStreak = 0; // Yanlış cevap seriyi sıfırlar
    }

    // 4 veya daha fazla seri yaparsa "öğrenildi" olsun
    if (newStreak >= 4) {
        newStatus = 'learned';
    }

    const nextDate = newStatus === 'learned' ? null : calculateNextQuizDate(newStreak);

    const { error } = await _supabase
        .from('word_list')
        .update({
            quiz_streak: newStreak,
            learning_status: newStatus,
            next_quiz_date: nextDate
        })
        .eq('id', word.id);

    if (error) {
        console.error("Kelime durumu güncellenemedi:", error);
        // Burada kullanıcıya bir bildirim gösterebilirsiniz.
    }
};

// --- YENİ FONKSİYON: GERİBİLDİRİM MODAL'INI GÖSTERME ---
const showFeedbackModal = (isCorrect) => {
    const correctIdx = currentQuestions[currentIndex].correctIndex;
    const correctText = currentQuestions[currentIndex].options[correctIdx];

    const modal = document.getElementById('quiz-feedback-modal');
    const modalTitle = document.getElementById('quiz-modal-title');
    const modalWord = document.getElementById('quiz-modal-word');
    const nextBtn = document.getElementById('quiz-modal-next-btn');

    if (isCorrect) {
        modal.classList.remove('hidden', 'wrong');
        modal.classList.add('correct');
        modalTitle.textContent = 'Correct!';
        modalWord.textContent = `“${correctText}”`;
    } else {
        modal.classList.remove('hidden', 'correct');
        modal.classList.add('wrong');
        modalTitle.textContent = 'Wrong!';
        modalWord.textContent = `Correct: “${correctText}”`;
    }

    // Modal'daki butona tıklandığında sonraki soruya geç
    nextBtn.onclick = () => {
        modal.classList.add('hidden');
        currentIndex++;
        showQuestion();
    };

    modal.classList.remove('hidden');
};


// --- 4. SONUCU GÖSTERME (showResults) ---
const showResults = async () => {
    const user = getUser();
    if (!user) return;
 
    quizContainer.classList.add('hidden');
    resultArea.classList.remove('hidden');
    
    const total = currentQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    scoreText.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 10px;">${score} / ${total}</div>
        <div>Success Rate: %${percentage}</div>
        <p id="save-status" style="font-size: 0.9rem; color: #64748b;">Saving result...</p>
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
 
        document.getElementById('save-status').textContent = "✅ Result saved successfully.";
        document.getElementById('save-status').style.color = "#16a34a";
 
    } catch (err) {
        console.error("Sonuç kaydedilemedi:", err);
        document.getElementById('save-status').textContent = "❌ An error occurred while saving result.";
        document.getElementById('save-status').style.color = "#dc2626";
    }
};

// --- EVENT LISTENERS & INIT ---
startBtn.addEventListener('click', handleStartQuiz);
 
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
    });
}
 
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
 
    if (!user) {
        window.location.href = '../../index.html';
        return;
    }
 
    if (user && welcomeMessage) {
        welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
        // Sayfa yüklendiğinde quiz'e uygun kelime sayısını göster
        updateIntroText();
        // Geçmiş quiz sonuçlarını yükle
        loadQuizHistory(); 
    }

    // Avatarı header'a yükle
    const userAvatar = JSON.parse(localStorage.getItem('user'));
    if (userAvatar && userAvatar.avatar_url) {
        const imgEl = document.getElementById('header-avatar');
        if(imgEl) imgEl.src = userAvatar.avatar_url;
    }
});


// --- QUIZ GEÇMİŞİNİ YÜKLEME ---
const loadQuizHistory = async () => {
  const user = getUser();
  if (!user) return;

  const historyArea = document.getElementById('quiz-history-list');
  if (!historyArea) return;

  const { data, error } = await _supabase
    .from('quiz_results')
    .select('score, total_questions, success_rate, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    historyArea.innerHTML = "<p>Quiz history could not be loaded.</p>";
    return;
  }

  if (!data || data.length === 0) {
    historyArea.innerHTML = "<p>You don't have quiz history yet.</p>";
    return;
  }

  historyArea.innerHTML = `
  <table style="width:100%; border-collapse:collapse; margin-top:10px;">
    <thead>
      <tr style="border-bottom:2px solid #e5e7eb;">
        <th style="text-align:left; padding:8px;">Date</th>
        <th style="text-align:center; padding:8px;">Score</th>
        <th style="text-align:center; padding:8px;">Success</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(r => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;">${new Date(r.created_at).toLocaleDateString('en-US')}</td>
          <td style="padding:8px; text-align:center;">
            ${r.score} / ${r.total_questions}
          </td>
          <td style="padding:8px; text-align:center;">
            %${r.success_rate}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;
};
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
 
// 🚨 YENİ EKLENEN ELEMENTLER (HTML'den gelmeli)
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
// 🚨 YENİ EKLENEN ELEMENTLER SONU
 
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
        console.error("Quiz JSON Parse Error:", text);
        throw new Error("AI could not create a valid quiz format.");
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
            infoText.innerHTML = `<span style="color: #dc2626;">Your list has only ${wordCount} words. At least 3 words are needed for quiz.</span>`;
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
        } else {
            infoText.textContent = `A test with ${quizCount} questions will be created from words with "Learning" status in your list.`;
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
        }
    } catch (err) {
        console.error("Word count could not be retrieved:", err);
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
            throw new Error("At least 3 words are needed for quiz. Your current word count: " + (words ? words.length : 0));
        }
 
        loader.textContent = `Preparing quiz with ${words.length} words...`;
 
        const response = await fetch(QUIZ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words })
        });
 
        const responseData = await response.json();
 
        if (!response.ok) throw new Error(responseData.error || "Server error.");
 
        if (!responseData.candidates || !responseData.candidates[0].content?.parts[0]?.text) {
            throw new Error("No valid content received from API.");
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
        console.error("Error:", error);
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
 
// --- 3. CEVAP KONTROLÜ ---
const handleAnswerClick = (selectedIndex) => {
    const correctIdx = currentQuestions[currentIndex].correctIndex;
    
    if (selectedIndex === correctIdx) {
        score++;
        alert("Correct! 🎉");
    } else {
        const correctText = currentQuestions[currentIndex].options[correctIdx];
        alert(`Wrong! ❌ The correct answer was: ${correctText}`);
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
 
// --- EVENT LISTENERS ---
startBtn.addEventListener('click', handleStartQuiz);
 
// 🚨 UPDATED LOGOUT FUNCTION (This runs when button is clicked)
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        // To go from quiz.html to index.html in root directory
        window.location.href = '../../index.html';
    });
}
 
// Welcome message and Dynamic Text Initialization (UPDATED)
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
 
    // 🚨 USER CHECK AND REDIRECT (Security)
    if (!user) {
        window.location.href = '../../index.html';
        return;
    }
 
    if (user && welcomeMessage) {
        // 🚨 Set welcome message
        welcomeMessage.innerText = `Welcome, ${user.full_name}!`;
        
        // Update dynamic text
        updateIntroText();
        loadQuizHistory(); 
    }
});
const userAvatar = JSON.parse(localStorage.getItem('user'));
if (userAvatar && userAvatar.avatar_url) {
    const imgEl = document.getElementById('header-avatar');
    if(imgEl) imgEl.src = userAvatar.avatar_url;
}
// 🆕 QUIZ HISTORY
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
          <td style="padding:8px;">${new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
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

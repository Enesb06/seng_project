import { _supabase } from '../supabaseClient.js';

// DOM Elementleri
const topicEl = document.getElementById('speaking-topic');
const newTopicBtn = document.getElementById('new-topic-btn');
const micBtn = document.getElementById('mic-btn');
const statusMsg = document.getElementById('status-message');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackPlaceholder = document.getElementById('feedback-placeholder');
const feedbackContent = document.getElementById('feedback-content');

// Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;
let currentTopic = "";

// Kullanıcı bilgilerini al
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/index.html'; // veya base path'li versiyonu
}

// Konuşma tanıma API'si destekleniyor mu kontrol et
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        statusMsg.textContent = "Listening... Speak about the topic. Click the mic again to stop.";
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        statusMsg.textContent = "Processing your speech...";
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        statusMsg.textContent = `Error: ${event.error}. Please try again.`;
        isRecording = false;
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        
        // Konuşma bittiğinde ve transcript varsa analiz et
        if (event.results[event.results.length - 1].isFinal) {
             analyzeSpeech(transcript);
        }
    };

} else {
    statusMsg.textContent = "Sorry, your browser does not support Speech Recognition.";
    micBtn.disabled = true;
}

// Mikrofon butonu tıklama olayı
micBtn.addEventListener('click', () => {
    if (!SpeechRecognition) return;

    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

// AI'dan konuşma analizi iste
async function analyzeSpeech(transcript) {
    if (!transcript.trim()) {
        statusMsg.textContent = "I didn't hear anything. Try again.";
        return;
    }

    try {
        const { data: feedback, error } = await _supabase.functions.invoke('analyze-speaking', {
            body: { topic: currentTopic, transcript: transcript },
        });

        if (error) throw error;
        
        renderFeedback(feedback, transcript);
        savePractice(transcript, feedback);

        statusMsg.textContent = "Here is your feedback! Press the microphone to try again.";

    } catch (error) {
        console.error('Error analyzing speech:', error);
        statusMsg.textContent = "Could not get feedback from AI. Please check the console.";
    }
}

// Gelen feedbacki ekranda göster
function renderFeedback(feedback, transcript) {
    document.getElementById('fluency-score').textContent = `${feedback.fluency_score}/10`;
    document.getElementById('grammar-score').textContent = `${feedback.grammar_score}/10`;
    document.getElementById('pronunciation-score').textContent = `${feedback.pronunciation_score}/10`;
    document.getElementById('feedback-summary').textContent = feedback.feedback_summary;
    document.getElementById('transcript-text').textContent = `"${transcript}"`;

    const grammarList = document.getElementById('grammar-points-list');
    grammarList.innerHTML = feedback.grammar_points.map(item => `<li>${item}</li>`).join('');

    const vocabList = document.getElementById('vocabulary-suggestions-list');
    vocabList.innerHTML = feedback.vocabulary_suggestions.map(item => `<li>${item}</li>`).join('');

    feedbackPlaceholder.style.display = 'none';
    feedbackContent.style.display = 'block';
}

// Pratiği veritabanına kaydet
async function savePractice(transcript, feedback) {
    const { error } = await _supabase.from('speaking_practice').insert({
        student_id: user.id,
        topic: currentTopic,
        transcript: transcript,
        feedback: feedback // feedback zaten JSON objesi
    });

    if (error) {
        console.error('Error saving practice to DB:', error);
    } else {
        console.log('Speaking practice saved successfully.');
    }
}


// Yeni bir konu al
const topics = [
    "Describe your favorite holiday.",
    "What is your dream job and why?",
    "Talk about a book you have recently read.",
    "What are the pros and cons of social media?",
    "Describe a memorable trip you have taken.",
    "If you could have any superpower, what would it be?",
    "Talk about your hobbies and interests."
];

function getNewTopic() {
    const randomIndex = Math.floor(Math.random() * topics.length);
    currentTopic = topics[randomIndex];
    topicEl.textContent = currentTopic;

    // Feedback alanını başlangıç durumuna getir
    if (feedbackPlaceholder && feedbackContent) {
        feedbackPlaceholder.style.display = 'block'; 
        feedbackContent.style.display = 'none';    
    }
    statusMsg.textContent = "Press the microphone to start speaking";
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    getNewTopic();
});

newTopicBtn.addEventListener('click', getNewTopic);
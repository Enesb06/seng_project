import { _supabase } from '../supabaseClient.js';

// --- ELEMENTLER ---
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const historyList = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const welcomeMessageEl = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logout-button');
const headerAvatar = document.getElementById('header-avatar');
const micBtn = document.getElementById('mic-btn'); // --- YENİ EKLENDİ: Mikrofon butonu ---

const AI_CHAT_URL = 'https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-chat-response';
let conversationHistory = [];
let currentSessionId = null;

// --- KULLANICI BİLGİSİ ---
const getUser = () => {
    // ... Bu fonksiyon aynı kalıyor ...
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '../../index.html';
        return null;
    }
    return JSON.parse(user);
};

// --- YARDIMCI FONKSİYONLAR ---
const renderMessage = (sender, content) => {
    // ... Bu fonksiyon aynı kalıyor ...
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender);
    if (sender === 'ai') {
        const rawHtml = marked.parse(content);
        const sanitizedHtml = DOMPurify.sanitize(rawHtml);
        messageDiv.innerHTML = sanitizedHtml;
    } else {
        messageDiv.innerText = content;
    }
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
};

const startNewChat = () => {
    // ... Bu fonksiyon aynı kalıyor ...
    currentSessionId = null;
    conversationHistory = [];
    chatWindow.innerHTML = `<div class="chat-message ai">Hello! Let's start a new chat. How can I help you?</div>`;
    chatInput.value = '';
    history.pushState(null, '', 'ai-chat.html');
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
};

// --- SOHBET GEÇMİŞİ YÖNETİMİ ---
const loadSessionHistory = async (userId) => {
    // ... Bu fonksiyon aynı kalıyor ...
    const { data, error } = await _supabase
        .from('chat_sessions')
        .select('id, title')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Chat history could not be loaded:', error);
        return;
    }
    historyList.innerHTML = '';
    data.forEach(session => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.textContent = session.title || 'New Chat';
        item.dataset.sessionId = session.id;
        historyList.appendChild(item);
    });
};

const loadChatMessages = async (sessionId) => {
    // ... Bu fonksiyon aynı kalıyor ...
    chatWindow.innerHTML = '<p>Loading chat...</p>';
    const { data, error } = await _supabase
        .from('chat_messages')
        .select('sender, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
    if (error) {
        chatWindow.innerHTML = '<p>Error: Chat could not be loaded.</p>';
        return;
    }
    currentSessionId = sessionId;
    conversationHistory = [];
    chatWindow.innerHTML = '';
    data.forEach(msg => {
        renderMessage(msg.sender, msg.content);
        conversationHistory.push({
            role: msg.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    });
    document.querySelectorAll('.history-item').forEach(el => {
        el.classList.toggle('active', el.dataset.sessionId === String(sessionId));
    });
};

// --- ANA İŞLEV: MESAJ GÖNDERME ---
const handleSendMessage = async (event) => {
    // ... Bu fonksiyon aynı kalıyor ...
    event.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    const user = getUser();
    if (!user) return;
    renderMessage('user', userMessage);
    chatInput.value = '';
    sendBtn.disabled = true;
    if (!currentSessionId) {
        const { data, error } = await _supabase
            .from('chat_sessions')
            .insert({ user_id: user.id, title: userMessage.substring(0, 40) })
            .select('id')
            .single();
        if (error) {
            console.error('New chat session could not be created:', error);
            renderMessage('ai', 'An error occurred, chat could not be started.');
            sendBtn.disabled = false;
            return;
        }
        currentSessionId = data.id;
        history.pushState(null, '', `?session=${currentSessionId}`);
        await loadSessionHistory(user.id);
        document.querySelector(`[data-session-id='${currentSessionId}']`).classList.add('active');
    }
    await _supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: currentSessionId,
        sender: 'user',
        content: userMessage
    });
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('typing-indicator');
    typingIndicator.innerText = 'AI is thinking...';
    chatWindow.appendChild(typingIndicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    try {
        const response = await fetch(AI_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                history: conversationHistory.slice(0, -1)
            })
        });
        if (!response.ok) throw new Error('Error from AI service.');
        const { reply: aiMessage } = await response.json();
        renderMessage('ai', aiMessage);
        await _supabase.from('chat_messages').insert({
            user_id: user.id,
            session_id: currentSessionId,
            sender: 'ai',
            content: aiMessage
        });
        conversationHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
    } catch (error) {
        console.error('AI Response Error:', error);
        renderMessage('ai', 'Sorry, a problem occurred.');
    } finally {
        chatWindow.removeChild(typingIndicator);
        sendBtn.disabled = false;
        chatInput.focus();
    }
};


// --- YENİ EKLENDİ: SES TANIMA (SPEECH-TO-TEXT) MANTIĞI ---

// Tarayıcı desteğini kontrol et
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Konuşma durunca hemen bitirmemesi için
    recognition.interimResults = true; // Konuşurken anlık sonuçları göstermesi için
    recognition.lang = 'tr-TR'; // Dili Türkçe olarak ayarla

    // Ses tanıma başladığında
    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micBtn.title = "Stop listening";
        chatInput.placeholder = 'Listening... Speak now.';
    };

    // Ses tanıma bittiğinde
    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.title = "Speak your message";
        chatInput.placeholder = 'Ask a question...';
    };

    // Hata olduğunda
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access was denied. Please allow microphone access in your browser settings.');
        }
    };

    // Konuşma algılandığında
    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        
        chatInput.value = transcript;
    };

    // Mikrofon butonuna tıklama olayı
    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            // Butona basıldığında mevcut yazıyı temizleyip dinlemeye başla
            chatInput.value = '';
            recognition.start();
        }
    });

} else {
    // Tarayıcı desteklemiyorsa butonu gizle
    console.warn("Speech Recognition API is not supported in this browser.");
    micBtn.style.display = 'none';
}


// --- SAYFA BAŞLATMA ---
document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user) return;

    if (welcomeMessageEl) welcomeMessageEl.innerText = `Welcome, ${user.full_name}!`;
    if (headerAvatar && user.avatar_url) headerAvatar.src = user.avatar_url;

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '../../index.html';
        });
    }

    // Olay dinleyicileri
    chatForm.addEventListener('submit', handleSendMessage);
    newChatBtn.addEventListener('click', startNewChat);
    historyList.addEventListener('click', (e) => {
        if (e.target.matches('.history-item')) {
            const sessionId = e.target.dataset.sessionId;
            if (sessionId) {
                window.location.search = `?session=${sessionId}`;
            }
        }
    });

    // Geçmişi yükle
    await loadSessionHistory(user.id);

    // URL'de bir session ID'si var mı kontrol et
    const params = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = params.get('session');
    
    if (sessionIdFromUrl) {
        await loadChatMessages(sessionIdFromUrl);
    } else {
        startNewChat();
    }
});
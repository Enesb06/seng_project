import { _supabase } from "../supabaseClient.js";

/* ========= GENEL DEĞİŞKENLER & SEÇİCİLER ========= */
let currentEssayId = null;
let currentAudio = null;

// ... (getUser, goHome gibi diğer yardımcı fonksiyonlar aynı kalıyor) ...
const goHome = () => {
  localStorage.removeItem("user");
  window.location.href = "../../index.html";
};
const getUser = () => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readingTitle = document.getElementById("reading-title");
const readingBody = document.getElementById("reading-body");
const playTextBtn = document.getElementById("play-text-btn");
const playIcon = document.getElementById("play-icon");
const audioLoader = document.getElementById("audio-loader");
const audioControls = document.getElementById("audio-controls");
// ... (diğer tüm element seçicileriniz aynı kalıyor) ...
const materialsList = document.getElementById("materials-list");
const noteTextarea = document.getElementById("note-textarea");
const historyContainer = document.getElementById("note-history-list");
const tooltip = document.getElementById("translation-tooltip");
const tooltipWord = document.getElementById("tooltip-word");
const tooltipMeaning = document.getElementById("tooltip-meaning");
const addWordBtn = document.getElementById("add-to-wordlist-btn");
const playPronunciationBtn = document.getElementById("play-pronunciation-btn");
const preferencesModal = document.getElementById("preferences-modal");
const preferencesForm = document.getElementById("preferences-form");
const loader = document.getElementById("loader");
const favoriteBtn = document.getElementById("favorite-btn");
const welcomeMessageEl = document.getElementById("welcome-message");
const logoutButton = document.getElementById("logout-button");

const AI_FUNCTION_URL =
  "https://infmglbngspopnxrjnfv.supabase.co/functions/v1/generate-reading-material";
const PROJECT_URL = "https://infmglbngspopnxrjnfv.supabase.co";

/* ========= YARDIMCI: TARİH FORMATLAMA ========= */
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  return new Date(dateString).toLocaleDateString("tr-TR", options);
};

// === 1. KELİME SESLENDİRME (ESKİ, BASİT HALİ) ===
const speakWord = (word) => {
  try {
    const ttsFunctionUrl =
      `${PROJECT_URL}/functions/v1/get-pronunciation?text=${
        encodeURIComponent(word)
      }`;
    const audio = new Audio(ttsFunctionUrl);
    audio.play();
  } catch (error) {
    console.error("Telaffuz oynatılırken hata oluştu:", error);
    alert("Sesli telaffuz şu an kullanılamıyor.");
  }
};

// === 2. TÜM METNİ SESLENDİRME (YENİ, GÜVENİLİR HALİ) ===
const playFullTextAudio = async () => {
  const textToSpeak = readingBody.innerText;
  if (!textToSpeak || textToSpeak.trim() === "") {
    alert("There is no text to play.");
    return;
  }

  playIcon.classList.add("hidden");
  audioLoader.classList.remove("hidden");

  try {
    const ttsFunctionUrl = `${PROJECT_URL}/functions/v1/synthesize-text`;
    const response = await fetch(ttsFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textToSpeak }),
    });

    if (!response.ok) {
      throw new Error(`Audio service failed with status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (currentAudio) currentAudio.pause();

    currentAudio = new Audio(audioUrl);

    audioLoader.classList.add("hidden");
    playIcon.classList.remove("hidden");
    playIcon.src = "https://cdn-icons-png.flaticon.com/512/727/727246.png"; // Pause icon

    currentAudio.play();

    currentAudio.onended = () => {
      playIcon.src = "https://cdn-icons-png.flaticon.com/512/727/727245.png"; // Play icon
      URL.revokeObjectURL(currentAudio.src);
      currentAudio = null;
    };
  } catch (error) {
    console.error("playFullTextAudio error:", error);
    alert("An error occurred while trying to play the audio.");
    audioLoader.classList.add("hidden");
    playIcon.classList.remove("hidden");
  }
};

// ... (favori, kelime çeviri, materyal görüntüleme gibi diğer tüm fonksiyonlar aynı kalıyor) ...

/* ========= FAVORİ YÖNETİMİ ========= */
const getFavorites = () => {
  const user = getUser();
  if (!user) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(`favorites_${user.id}`));
    return Array.isArray(stored) ? stored.map((id) => String(id)) : [];
  } catch {
    return [];
  }
};
const saveFavorites = (favorites) => {
  const user = getUser();
  if (!user) return;
  localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favorites));
};
const updateFavoriteIcon = () => {
  const icon = document.getElementById("favorite-icon");
  if (!icon) return;
  const favorites = getFavorites();
  const isFav = favorites.includes(String(currentEssayId));
  if (isFav) {
    icon.src = "https://cdn-icons-png.flaticon.com/512/833/833472.png";
    favoriteBtn.classList.add("active");
  } else {
    icon.src = "https://cdn-icons-png.flaticon.com/512/812/812327.png";
    favoriteBtn.classList.remove("active");
  }
};
window.getReadingFavorites = getFavorites;
/* ========= 1) KELİME ÇEVİRİ ========= */
const wrapWords = (text) => {
  if (!text) return "";
  return text.split(/(\s+)/).map((part) => {
    if (/\w+/.test(part)) {
      const cleanWord = part.replace(/[.,!?;:()]/g, "");
      const punctuation = part.replace(cleanWord, "");
      return `<span class="word" data-word="${cleanWord}">${cleanWord}</span>${punctuation}`;
    }
    return part;
  }).join("");
};
const getTranslation = async (word) => {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${word}&langpair=en|tr`,
    );
    const data = await res.json();
    return data.responseData.translatedText || "Translation not found";
  } catch {
    return "Connection error";
  }
};
/* ========= OKUNDU SAY (Supabase) ========= */
const markAsRead = async (contentId) => {
  const user = getUser();
  if (!user || !contentId) return;
  const payload = {
    student_id: String(user.id),
    content_id: contentId,
    read_at: new Date().toISOString(),
  };
  const { error } = await _supabase.from("reading_logs").upsert(payload, {
    onConflict: "student_id,content_id",
  });
  if (error) console.error("markAsRead error:", error);
};
/* ========= 2) MATERYAL GÖRÜNTÜLEME ========= */
const displayMaterial = async (contentId) => {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }
  if (playIcon) {
    playIcon.src = "https://cdn-icons-png.flaticon.com/512/727/727245.png";
  }
  if (audioControls) audioControls.classList.remove("hidden");
  try {
    const user = getUser();
    if (!user) return goHome();
    currentEssayId = contentId;
    document.querySelectorAll(".material-item").forEach((el) =>
      el.classList.remove("active")
    );
    const selected = document.querySelector(`[data-id='${contentId}']`);
    if (selected) selected.classList.add("active");
    const { data, error } = await _supabase.from("contents").select("*").eq(
      "id",
      contentId,
    ).single();
    if (error || !data) throw error || new Error("Content not found");
    if (readingTitle) readingTitle.textContent = data.title || "";
    const contentBody = data.body || "";
    try {
      let dialogueData = JSON.parse(contentBody);
      if (
        Array.isArray(dialogueData) && dialogueData.length > 0 &&
        Array.isArray(dialogueData[0])
      ) dialogueData = dialogueData[0];
      if (
        Array.isArray(dialogueData) && dialogueData.length > 0 &&
        dialogueData[0].speaker && dialogueData[0].dialogue
      ) {
        const formattedDialogue = dialogueData.map((line) =>
          `<p class="dialogue-line"><strong>${line.speaker}:</strong> ${
            wrapWords(line.dialogue)
          }</p>`
        ).join("");
        if (readingBody) readingBody.innerHTML = formattedDialogue;
      } else throw new Error("Not a dialogue format");
    } catch (e) {
      if (readingBody) readingBody.innerHTML = wrapWords(contentBody);
    }
    await markAsRead(contentId);
    const savedNote = localStorage.getItem(`note_${user.id}_${contentId}`);
    if (noteTextarea) noteTextarea.value = savedNote || "";
    updateFavoriteIcon();
  } catch (err) {
    console.error("displayMaterial Hata:", err);
    if (readingBody) {
      readingBody.innerHTML =
        '<p style="color:red;">Could not load this material.</p>';
    }
    if (audioControls) audioControls.classList.add("hidden");
  }
};
window.displayMaterial = displayMaterial;
/* ========= 3) NOT & GEÇMİŞ ========= */
const getHistoryList = () => {
  const user = getUser();
  if (!user) return [];
  const raw = localStorage.getItem(`history_${user.id}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};
const renderHistory = () => {
  const user = getUser();
  if (!user || !historyContainer) return;
  const history = getHistoryList();
  if (history.length === 0) {
    historyContainer.innerHTML =
      '<p style="color:#999; font-size:0.8rem; padding:10px;">No notes yet.</p>';
    return;
  }
  historyContainer.innerHTML = history.map((item) =>
    `<div class="history-item" onclick="displayMaterial('${item.id}')" style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;"><div style="font-weight: bold; font-size: 0.85rem;">${item.title}</div><div style="font-size: 0.7rem; color: #888;">${item.date}</div></div>`
  ).join("");
};
const saveCurrentNote = () => {
  if (!currentEssayId) {
    alert("Please select a text first!");
    return;
  }
  const user = getUser();
  if (!user) return goHome();
  const noteText = noteTextarea ? noteTextarea.value : "";
  const title = readingTitle ? readingTitle.textContent : "";
  localStorage.setItem(`note_${user.id}_${currentEssayId}`, noteText);
  let history = getHistoryList();
  history = history.filter((item) =>
    String(item.id) !== String(currentEssayId)
  );
  if (noteText.trim() !== "") {
    history.unshift({
      id: currentEssayId,
      title,
      date: new Date().toLocaleDateString("tr-TR"),
    });
  }
  localStorage.setItem(`history_${user.id}`, JSON.stringify(history));
  const indicator = document.getElementById("save-indicator");
  if (indicator) {
    indicator.style.display = "block";
    setTimeout(() => (indicator.style.display = "none"), 2000);
  }
  renderHistory();
};
/* ========= 4) AI MATERYAL OLUŞTURMA & LİSTE ========= */
const handleGenerateNewMaterial = async (e) => {
  e.preventDefault();
  const user = getUser();
  if (!user) return goHome();
  if (loader) loader.classList.remove("hidden");
  if (preferencesModal) preferencesModal.classList.add("hidden");
  const category = document.getElementById("interest-category")?.value;
  const difficulty = document.getElementById("difficulty-level")?.value;
  const length = document.getElementById("content-length")?.value;
  const textType = document.getElementById("text-type")?.value;
  const isDialogue = textType === "dialogue";
  const promptDetails =
    `Write a ${length} English ${textType} about ${category} for ${difficulty} level. ${
      isDialogue
        ? 'Response MUST be ONLY a JSON array of objects like this: [{"speaker": "Name", "dialogue": "Text..."}].'
        : 'Response MUST be ONLY JSON: {"title": "...", "body": "..."}'
    }`;
  try {
    const response = await fetch(AI_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptDetails }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Server responded with status: ${response.status}`,
      );
    }
    const responseData = await response.json();
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let title, body;
    if (isDialogue) {
      body = cleaned;
      const firstLetter = textType.charAt(0).toUpperCase();
      const restOfTextType = textType.slice(1);
      title = `${firstLetter + restOfTextType} about ${category}`;
    } else {try {
        const parsedData = JSON.parse(cleaned);
        title = parsedData.title;
        body = parsedData.body;
      } catch (parseError) {
        console.warn("AI response was not valid JSON. Using raw text as body.");
        body = cleaned;
      }}
    if (!title) {
      const firstLetter = textType.charAt(0).toUpperCase();
      const restOfTextType = textType.slice(1);
      title = `${firstLetter + restOfTextType} about ${category}`;
    }
    if (!body) {
      throw new Error(
        "AI did not return any content. This might be due to a restrictive prompt or a safety filter. Please try rephrasing your request.",
      );
    }
    const { data: newContent, error } = await _supabase.from("contents").insert(
      { title, body, user_id: user.id },
    ).select("id").single();
    if (error) throw error;
    await loadUserMaterials();
    await displayMaterial(newContent.id);
  } catch (err) {
    alert("Error generating content: " + (err?.message || err));
    console.error(err);
  } finally {
    if (loader) loader.classList.add("hidden");
  }
};
const loadUserMaterials = async () => {
  const user = getUser();
  if (!user || !materialsList) return;
  const { data, error } = await _supabase.from("contents").select(
    "id, title, created_at",
  ).eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    materialsList.innerHTML =
      '<p style="color:red;font-size:0.85rem;">Error occurred while loading materials.</p>';
    return;
  }
  if (!data || data.length === 0) {
    materialsList.innerHTML =
      '<p style="color:#9ca3af;font-size:0.85rem;">You havent created any materials yet.</p>';
    return;
  }
  materialsList.innerHTML = data.map((m) =>
    `<div class="material-item" data-id="${m.id}" onclick="displayMaterial('${m.id}')" style="padding:12px 10px;border-bottom:1px solid #e5e7eb;cursor:pointer;"><div style="font-weight:600;font-size:0.95rem;">${m.title}</div><div style="font-size:0.75rem;color:#6b7280;">${
      formatDate(m.created_at)
    }</div></div>`
  ).join("");
};
/* ========= EVENT LISTENER'LAR ========= */
if (playTextBtn) {
  playTextBtn.addEventListener("click", () => {
    if (!currentEssayId) {
      alert("Please select a material to listen to.");
      return;
    }
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      playIcon.src = "https://cdn-icons-png.flaticon.com/512/727/727245.png";
    } else if (currentAudio && currentAudio.paused) {
      currentAudio.play();
      playIcon.src = "https://cdn-icons-png.flaticon.com/512/727/727246.png";
    } else playFullTextAudio();
  });
}
if (readingBody) {
  readingBody.addEventListener("click", async (e) => {
    // If a word is clicked, open tooltip and prevent global click handler from closing it
    if (e.target.classList.contains("word")) {
      e.stopPropagation();

      const word = e.target.dataset.word;
      const rect = e.target.getBoundingClientRect();

      if (tooltip) {
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 95}px`;
        tooltip.style.display = "flex";
      }

      if (tooltipWord) tooltipWord.textContent = word;

      if (tooltipMeaning) {
        tooltipMeaning.textContent = "Translating...";
        tooltipMeaning.textContent = await getTranslation(word);
      }

      if (addWordBtn) {
        addWordBtn.onclick = async () => {
          const user = getUser();
          if (!user) return goHome();
          const { error } = await _supabase.from("word_list").insert({
            student_id: user.id,
            word,
            definition: tooltipMeaning?.textContent || "",
            learning_status: "learning",
          });
          if (!error) {
            alert("Word added!");
            if (tooltip) tooltip.style.display = "none";
          }
        };
      }

      if (playPronunciationBtn) {
        playPronunciationBtn.onclick = () => {
          speakWord(word);
        };
      }
    }
  });
}

// Tooltip openken tooltip'un içine tıklanınca kapanmasın
if (tooltip) {
  tooltip.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// Sayfada herhangi bir yere tıklanınca (tooltip/kelime dışında) tooltip kapansın
document.addEventListener("click", (e) => {
  if (!tooltip) return;
  if (tooltip.style.display !== "flex") return;

  const clickedWord = e.target.closest(".word");
  const clickedInsideTooltip = e.target.closest("#translation-tooltip");

  if (!clickedWord && !clickedInsideTooltip) {
    tooltip.style.display = "none";
  }
});

// ESC ile kapatma (opsiyonel ama kullanışlı)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && tooltip) {
    tooltip.style.display = "none";
  }
});
const saveBtn = document.getElementById("save-note-btn");
if (saveBtn) saveBtn.onclick = saveCurrentNote;
if (noteTextarea) {
  noteTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      saveCurrentNote();
    }
  });
}
const newMaterialBtn = document.getElementById("new-material-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
if (newMaterialBtn && preferencesModal) {
  newMaterialBtn.onclick = () => preferencesModal.classList.remove("hidden");
}
if (closeModalBtn && preferencesModal) {
  closeModalBtn.onclick = () => preferencesModal.classList.add("hidden");
}
if (preferencesForm) preferencesForm.onsubmit = handleGenerateNewMaterial;
if (favoriteBtn) {
  favoriteBtn.addEventListener("click", () => {
    if (!currentEssayId) {
      alert("Please select a text first!");
      return;
    }
    const favorites = getFavorites();
    const idStr = String(currentEssayId);
    if (favorites.includes(idStr)) {
      saveFavorites(favorites.filter((id) => id !== idStr));
    } else {
      favorites.push(idStr);
      saveFavorites(favorites);
    }
    updateFavoriteIcon();
  });
}
if (logoutButton) logoutButton.addEventListener("click", goHome);
/* ========= SAYFA BAŞLATICI ========= */
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user) return goHome();
  if (welcomeMessageEl) {
    welcomeMessageEl.innerText = `Welcome, ${user.full_name}!`;
  }
  loadUserMaterials();
  renderHistory();
  updateFavoriteIcon();
  if (user.avatar_url) {
    const imgEl = document.getElementById("header-avatar");
    if (imgEl) imgEl.src = user.avatar_url;
  }
  const categorySelect = document.getElementById("interest-category");
  const textTypeSelect = document.getElementById("text-type");
  const allOptionsSource = document.getElementById("all-text-type-options");
  const validMappings = {
    "technology": [
      "article",
      "news report",
      "blog post",
      "review",
      "problem-solution essay",
      "email",
    ],
    "science": [
      "article",
      "news report",
      "blog post",
      "biography",
      "problem-solution essay",
    ],
    "history": ["article", "short story", "biography", "diary", "news report"],
    "art and culture": [
      "article",
      "review",
      "blog post",
      "biography",
      "opinion essay",
    ],
    "travel": ["blog post", "diary", "email", "review", "short story"],
    "daily life": [
      "short story",
      "diary",
      "dialogue",
      "email",
      "blog post",
      "fable",
      "fairy tale",
    ],
    "sports": [
      "article",
      "news report",
      "biography",
      "opinion essay",
      "blog post",
      "review",
      "dialogue",
    ],
    "nature and environment": [
      "article",
      "news report",
      "problem-solution essay",
      "blog post",
      "fable",
      "short story",
    ],
    "health and wellness": [
      "article",
      "blog post",
      "problem-solution essay",
      "review",
      "dialogue",
      "email",
    ],
    "entertainment": [
      "review",
      "news report",
      "blog post",
      "biography",
      "opinion essay",
      "article",
    ],
    "food and cooking": [
      "blog post",
      "review",
      "article",
      "short story",
      "diary",
      "email",
    ],
  };
  textTypeSelect.disabled = true;
  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    const validTypes = validMappings[selectedCategory] || [];
    textTypeSelect.innerHTML =
      '<option value="" disabled selected>-- Select a text type --</option>';
    if (validTypes.length > 0) {
      textTypeSelect.disabled = false;
      validTypes.forEach((typeValue) => {
        const originalOption = allOptionsSource.querySelector(
          `option[value='${typeValue}']`,
        );
        if (originalOption) {
          textTypeSelect.appendChild(originalOption.cloneNode(true));
        }
      });
    } else {
      textTypeSelect.disabled = true;
      textTypeSelect.innerHTML =
        '<option value="" disabled selected>-- First select a category --</option>';
    }
  });
});

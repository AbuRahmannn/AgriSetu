// ==========================================================================
// AgriSetu Conversational Chatbot Page Controller (Multilingual Speech AI)
// ==========================================================================

import { currentLanguage } from "./main.js";
import { API_BASE } from "./config.js";

let chatHistory = [];
let speechRecognition = null;
let isRecording = false;

const SUGGESTIONS = {
  "en": [
    { label: "🌾 Best Crop Recommendation", query: "recommend crop based on soil" },
    { label: "🔍 Tomato early blight spots", query: "symptoms of early blight in tomato" },
    { label: "📊 Best selling season", query: "when is the best time to sell rice" },
    { label: "⛓️ How blockchain verification works", query: "how does blockchain traceability work" }
  ],
  "hi": [
    { label: "🌾 सर्वोत्तम फसल की सलाह", query: "recommend crop based on soil" },
    { label: "🔍 टमाटर झुलसा रोग के लक्षण", query: "symptoms of early blight in tomato" },
    { label: "📊 धान बेचने का सही समय", query: "when is the best time to sell rice" },
    { label: "⛓️ ब्लॉकचेन सत्यापन कैसे कार्य करता है", query: "how does blockchain traceability work" }
  ],
  "te": [
    { label: "🌾 నేలకు తగిన పంట ఎంపిక", query: "recommend crop based on soil" },
    { label: "🔍 టమోటా ఆకు మచ్చ తెగులు లక్షణాలు", query: "symptoms of early blight in tomato" },
    { label: "📊 వరి అమ్మడానికి సరైన సమయం", query: "when is the best time to sell rice" },
    { label: "⛓️ బ్లాక్‌చైన్ వెరిఫికేషన్ పనిచేయుట", query: "how does blockchain traceability work" }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  initChatbot();
  initSpeechRecognition();
  initFloatingChatbot();
});

// Sync default bots welcome greeting based on language change
window.addEventListener("langChange", (e) => {
  const lang = e.detail;
  const messagesContainer = document.getElementById("chatMessages");
  const floatingMessages = document.getElementById("floatingChatMessages");
  
  const greetings = {
    "en": "Namaste! I am AgriSetu AI. How can I help you with your fields today?",
    "hi": "नमस्ते! मैं एग्रीसेतु एआई हूं। आज मैं आपके खेतों के लिए क्या सहायता कर सकता हूं?",
    "te": "నమస్తే! నేను అగ్రిసేతు AI. ఈ రోజు మీ పొలాల విషయంలో నేను మీకు ఏ విధంగా సహాయం చేయగలను?"
  };

  const greetingText = greetings[lang] || greetings["en"];

  if (messagesContainer) {
    messagesContainer.innerHTML = "";
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble bot";
    bubble.innerText = greetingText;
    messagesContainer.appendChild(bubble);
  }

  if (floatingMessages) {
    floatingMessages.innerHTML = "";
    const fBubble = document.createElement("div");
    fBubble.className = "chat-bubble bot";
    fBubble.style.maxWidth = "85%";
    fBubble.style.padding = "0.65rem 0.95rem";
    fBubble.style.fontSize = "0.8rem";
    fBubble.style.borderRadius = "0.75rem";
    fBubble.style.borderBottomLeftRadius = "0.25rem";
    fBubble.style.alignSelf = "flex-start";
    fBubble.style.background = "var(--bg-secondary)";
    fBubble.style.border = "1px solid var(--border-glass)";
    fBubble.style.color = "var(--color-text)";
    fBubble.innerText = greetingText;
    floatingMessages.appendChild(fBubble);
    
    // Add translation-specific suggestion chips directly inside the floating messages log
    renderFloatingSuggestions(lang);
  }
  
  chatHistory = []; // Reset history context on language change
});

function initChatbot() {
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");

  sendBtn.addEventListener("click", () => {
    sendMessage();
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

async function sendMessage() {
  const chatInput = document.getElementById("chatInput");
  const text = chatInput.value.trim();
  if (!text) return;

  // Add User Bubble
  appendBubble(text, "user");
  chatInput.value = "";

  // Prepare api context
  const messagesContainer = document.getElementById("chatMessages");
  const botBubble = document.createElement("div");
  botBubble.className = "chat-bubble bot";
  botBubble.innerText = "Analyzing query...";
  messagesContainer.appendChild(botBubble);
  smoothScrollToBottom(messagesContainer);

  const payload = {
    text: text,
    language: currentLanguage,
    history: chatHistory
  };

  try {
    const res = await fetch(API_BASE + "/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Could not reach chatbot API");
    const data = await res.json();

    // Render Answer
    botBubble.innerText = data.reply;
    smoothScrollToBottom(messagesContainer);

    // Save dialogue in history
    chatHistory.push({ sender: "user", text: text });
    chatHistory.push({ sender: "bot", text: data.reply });

    // Speak response out loud
    speakText(data.reply);

  } catch (error) {
    console.error("Chat failure:", error);
    botBubble.innerText = "Error: Sorry, I am having trouble connecting to my brain. Please check your connection.";
  }
}

function appendBubble(text, sender) {
  const messagesContainer = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerText = text;
  messagesContainer.appendChild(bubble);
  smoothScrollToBottom(messagesContainer);
}

// Speech Recognition (Speech-to-Text) Setup
function initSpeechRecognition() {
  const micBtn = document.getElementById("micBtn");
  const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechClass) {
    micBtn.style.display = "none"; // Hide button if Speech-to-Text not supported in browser
    return;
  }

  speechRecognition = new SpeechClass();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;

  // Match recognition language to selector
  speechRecognition.onstart = () => {
    isRecording = true;
    micBtn.innerText = "🛑 Stop";
    micBtn.classList.add("active");
  };

  speechRecognition.onend = () => {
    isRecording = false;
    micBtn.innerText = "🎙️ Speak";
    micBtn.classList.remove("active");
  };

  speechRecognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    isRecording = false;
    micBtn.innerText = "🎙️ Speak";
    micBtn.classList.remove("active");
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("chatInput").value = transcript;
    sendMessage(); // Submit query automatically
  };

  micBtn.addEventListener("click", () => {
    if (isRecording) {
      speechRecognition.stop();
    } else {
      // Set language code
      const codes = { "en": "en-US", "hi": "hi-IN", "te": "te-IN" };
      speechRecognition.lang = codes[currentLanguage] || "en-US";
      speechRecognition.start();
    }
  });
}

// Speech Synthesis (Text-to-Speech) Readout
function speakText(text) {
  if (!window.speechSynthesis) return;

  // Cancel any active readouts
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice based on language
  const codes = { "en": "en-US", "hi": "hi-IN", "te": "te-IN" };
  utterance.lang = codes[currentLanguage] || "en-US";
  
  // Find a suitable voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(voice => voice.lang.includes(utterance.lang));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  // Adjust synthesis rates
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// Floating Chatbot Trigger & Messaging Orchestration
// ==========================================================================
function initFloatingChatbot() {
  const bubble = document.getElementById("floatingChatBubble");
  const windowDiv = document.getElementById("floatingChatWindow");
  const closeBtn = document.getElementById("closeFloatingChat");
  const sendBtn = document.getElementById("floatingChatSend");
  const input = document.getElementById("floatingChatInput");
  const micBtn = document.getElementById("floatingMicBtn");

  if (!bubble) return;

  // Toggle open/close window
  bubble.addEventListener("click", () => {
    windowDiv.classList.toggle("hidden");
    if (!windowDiv.classList.contains("hidden")) {
      input.focus();
      // Instantly load suggestion chips matching current language on opening
      renderFloatingSuggestions(currentLanguage);
    }
  });

  closeBtn.addEventListener("click", () => {
    windowDiv.classList.add("hidden");
  });

  sendBtn.addEventListener("click", () => {
    sendFloatingMessage();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendFloatingMessage();
    }
  });

  // Speech recognition for floating mic
  let isFloatingRecording = false;
  const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechClass && micBtn) {
    const recog = new SpeechClass();
    recog.continuous = false;
    recog.interimResults = false;

    recog.onstart = () => {
      isFloatingRecording = true;
      micBtn.style.background = "var(--danger)";
      micBtn.style.color = "white";
    };

    recog.onend = () => {
      isFloatingRecording = false;
      micBtn.style.background = "rgba(255, 255, 255, 0.05)";
      micBtn.style.color = "var(--accent)";
    };

    recog.onerror = () => {
      isFloatingRecording = false;
      micBtn.style.background = "rgba(255, 255, 255, 0.05)";
      micBtn.style.color = "var(--accent)";
    };

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;
      sendFloatingMessage();
    };

    micBtn.addEventListener("click", () => {
      if (isFloatingRecording) {
        recog.stop();
      } else {
        const codes = { "en": "en-US", "hi": "hi-IN", "te": "te-IN" };
        recog.lang = codes[currentLanguage] || "en-US";
        recog.start();
      }
    });
  }
}

async function sendFloatingMessage() {
  const input = document.getElementById("floatingChatInput");
  const text = input.value.trim();
  if (!text) return;

  // Add User Bubble
  appendFloatingBubble(text, "user");
  input.value = "";

  // Add thinking bot bubble
  const messagesContainer = document.getElementById("floatingChatMessages");
  const botBubble = document.createElement("div");
  botBubble.className = "chat-bubble bot";
  botBubble.style.maxWidth = "85%";
  botBubble.style.padding = "0.65rem 0.95rem";
  botBubble.style.fontSize = "0.8rem";
  botBubble.style.borderRadius = "0.75rem";
  botBubble.style.borderBottomLeftRadius = "0.25rem";
  botBubble.style.alignSelf = "flex-start";
  botBubble.style.background = "var(--bg-secondary)";
  botBubble.style.border = "1px solid var(--border-glass)";
  botBubble.style.color = "var(--color-text)";
  botBubble.innerText = "Thinking...";
  
  messagesContainer.appendChild(botBubble);
  smoothScrollToBottom(messagesContainer);

  const payload = {
    text: text,
    language: currentLanguage,
    history: chatHistory
  };

  try {
    const res = await fetch(API_BASE + "/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Could not reach chatbot API");
    const data = await res.json();

    // Render Answer
    botBubble.innerText = data.reply;
    smoothScrollToBottom(messagesContainer);

    // Save dialogue in history
    chatHistory.push({ sender: "user", text: text });
    chatHistory.push({ sender: "bot", text: data.reply });

    // Speak response out loud
    speakText(data.reply);

  } catch (error) {
    console.error("Floating Chat failure:", error);
    botBubble.innerText = "Connection lost. Please make sure the AgriSetu server is running.";
    smoothScrollToBottom(messagesContainer);
  }
}

function appendFloatingBubble(text, sender) {
  const messagesContainer = document.getElementById("floatingChatMessages");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.style.maxWidth = "85%";
  bubble.style.padding = "0.65rem 0.95rem";
  bubble.style.fontSize = "0.8rem";
  bubble.style.borderRadius = "0.75rem";
  
  if (sender === "user") {
    bubble.style.borderBottomRightRadius = "0.25rem";
    bubble.style.alignSelf = "flex-end";
    bubble.style.background = "var(--primary)";
    bubble.style.color = "white";
  } else {
    bubble.style.borderBottomLeftRadius = "0.25rem";
    bubble.style.alignSelf = "flex-start";
    bubble.style.background = "var(--bg-secondary)";
    bubble.style.border = "1px solid var(--border-glass)";
    bubble.style.color = "var(--color-text)";
  }
  
  bubble.innerText = text;
  messagesContainer.appendChild(bubble);
  smoothScrollToBottom(messagesContainer);
}

// Render dynamic language-specific suggest chips container
function renderFloatingSuggestions(lang) {
  const floatingMessages = document.getElementById("floatingChatMessages");
  if (!floatingMessages) return;

  // Clear previous suggestion chips if they exist
  const existingChips = floatingMessages.querySelector(".chat-suggest-chips");
  if (existingChips) {
    existingChips.remove();
  }

  const chipsData = SUGGESTIONS[lang] || SUGGESTIONS["en"];
  const chipsContainer = document.createElement("div");
  chipsContainer.className = "chat-suggest-chips";

  chipsData.forEach(chip => {
    const chipNode = document.createElement("div");
    chipNode.className = "chat-suggest-chip";
    chipNode.innerText = chip.label;
    
    chipNode.addEventListener("click", () => {
      const input = document.getElementById("floatingChatInput");
      if (input) {
        input.value = chip.query;
        sendFloatingMessage();
      }
    });
    
    chipsContainer.appendChild(chipNode);
  });

  floatingMessages.appendChild(chipsContainer);
  smoothScrollToBottom(floatingMessages);
}

// Smooth scroll messaging elements helper
function smoothScrollToBottom(container) {
  if (!container) return;
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth"
  });
}

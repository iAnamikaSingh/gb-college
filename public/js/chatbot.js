(function () {
  const panel = document.getElementById("site-chat-panel");
  const toggle = document.getElementById("site-chat-toggle");
  const chatbot = document.querySelector(".site-chatbot");
  const close = document.getElementById("site-chat-close");
  const form = document.getElementById("site-chat-form");
  const input = document.getElementById("site-chat-input");
  const messages = document.getElementById("site-chat-messages");
  const suggestions = document.getElementById("site-chat-suggestions");
  const micButton = document.getElementById("site-chat-mic");
  const voiceOutputButton = document.getElementById("site-chat-voice-output");
  const soundToggle = document.getElementById("site-chat-sound-toggle");
  const voiceStatus = document.getElementById("site-chat-voice-status");
  let isReplying = false;
  let isListening = false;
  let voiceOutputEnabled = false;
  let soundEnabled = true;
  let chatbotOffsetX = 0;
  let chatbotOffsetY = 0;
  let audioContext = null;
  let cachedVoices = [];
  const conversationKey = "gbc-chat-history";
  let conversation = [];
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!panel || !toggle || !close || !form || !input || !messages) return;

  const navigation = window.performance.getEntriesByType("navigation")[0];
  const isReload = navigation
    ? navigation.type === "reload"
    : window.performance.navigation && window.performance.navigation.type === 1;

  try {
    if (isReload) window.sessionStorage.removeItem(conversationKey);
    const savedConversation = JSON.parse(
      window.sessionStorage.getItem(conversationKey) || "[]",
    );
    if (Array.isArray(savedConversation)) {
      conversation = savedConversation.filter(function (entry) {
        return (
          entry &&
          (entry.role === "user" || entry.role === "assistant") &&
          typeof entry.text === "string"
        );
      });
    }
  } catch (error) {
    conversation = [];
  }

  function saveConversation() {
    try {
      window.sessionStorage.setItem(
        conversationKey,
        JSON.stringify(conversation),
      );
    } catch (error) {
      // Chat remains usable when browser storage is unavailable.
    }
  }

  function playMessageSound(kind) {
    if (!soundEnabled) return;

    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    try {
      if (!audioContext) audioContext = new AudioContextConstructor();
      if (audioContext.state === "suspended")
        audioContext.resume().catch(function () {});

      const notes = kind === "sent" ? [740] : [523, 659];
      notes.forEach(function (frequency, index) {
        const start = audioContext.currentTime + index * 0.1;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.17);
      });
    } catch (error) {
      // Audio is an enhancement; blocked or unavailable audio should not interrupt chat.
    }
  }

  function setVoiceOutput(enabled) {
    voiceOutputEnabled = enabled;
    if (!voiceOutputButton) return;

    voiceOutputButton.setAttribute("aria-pressed", String(enabled));
    voiceOutputButton.setAttribute(
      "aria-label",
      enabled ? "Disable spoken replies" : "Enable spoken replies",
    );
    voiceOutputButton.title = enabled
      ? "Disable spoken replies"
      : "Enable spoken replies";
    voiceOutputButton.innerHTML = enabled
      ? '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-volume-xmark" aria-hidden="true"></i>';

    if (!enabled && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function loadVoices() {
    if (window.speechSynthesis)
      cachedVoices = window.speechSynthesis.getVoices();
  }

  if (window.speechSynthesis) {
    loadVoices();
    // Chrome/Edge load voices asynchronously, so refresh when they become ready.
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  }

  function pickIndianMaleVoice() {
    const maleHints =
      /\b(male|prabhat|ravi|rishi|hemant|madhur|kabir|arjun)\b/i;
    const femaleHints =
      /\b(female|neerja|heera|veena|lekha|kalpana|swara|aditi|priya)\b/i;

    let best = null;
    let bestScore = 0;

    cachedVoices.forEach(function (voice) {
      const lang = voice.lang.toLowerCase().replace(/_/g, "-");
      let score = 0;

      if (lang === "en-in") score += 10;
      else if (/india|indian/i.test(voice.name) && lang.startsWith("en"))
        score += 8;
      else return; // skip non-Indian-English voices

      if (maleHints.test(voice.name)) score += 20;
      if (femaleHints.test(voice.name)) score -= 30;
      if (/natural|online/i.test(voice.name)) score += 5; // neural voices sound friendlier

      if (score > bestScore) {
        best = voice;
        bestScore = score;
      }
    });

    return best;
  }

  function cleanForSpeech(text) {
    return text
      .replace(/\p{Extended_Pictographic}/gu, "") // don't read emojis aloud
      .replace(/[↗·]/g, ",")
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speakReply(text) {
    if (
      !voiceOutputEnabled ||
      !window.speechSynthesis ||
      !window.SpeechSynthesisUtterance
    )
      return;

    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.lang = "en-IN";
    utterance.rate = 1.05; // slightly brisk = upbeat
    utterance.pitch = 1.15; // a bit higher = youthful, cheerful
    utterance.volume = 1;

    const voice = pickIndianMaleVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }

  const seatTotals = [
    ["B.A.", "1,188"],
    ["B.Sc.", "540"],
    ["B.Com.", "324"],
    ["BCA", "60"],
    ["BBA", "60"],
  ];

  function setOpen(isOpen) {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.classList.toggle("is-chat-open", isOpen);
    if (isOpen && chatbot) {
      const bounds = chatbot.getBoundingClientRect();
      const left = Math.max(
        0,
        Math.min(window.innerWidth - bounds.width, bounds.left),
      );
      const top = Math.max(
        0,
        Math.min(window.innerHeight - bounds.height, bounds.top),
      );
      chatbotOffsetX += left - bounds.left;
      chatbotOffsetY += top - bounds.top;
      chatbot.style.setProperty("--chatbot-offset-x", chatbotOffsetX + "px");
      chatbot.style.setProperty("--chatbot-offset-y", chatbotOffsetY + "px");
    }
    if (isOpen) {
      input.focus();
    } else {
      toggle.focus();
    }
  }

  function addMessage(role, text, links, persist) {
    const message = document.createElement("div");
    message.className = "site-chat-message site-chat-message-" + role;

    const meta = document.createElement("div");
    meta.className = "site-chat-message-meta";

    if (role === "assistant") {
      const avatar = document.createElement("img");
      avatar.className = "site-chat-avatar";
      avatar.src = "/images/botPhoto.png";
      avatar.alt = "";
      meta.appendChild(avatar);
    } else {
      const userAvatar = document.createElement("span");
      userAvatar.className = "site-chat-user-avatar";
      userAvatar.setAttribute("aria-hidden", "true");
      userAvatar.innerHTML = '<i class="fa-solid fa-user-tie"></i>';
      meta.appendChild(userAvatar);
    }

    const sender = document.createElement("span");
    sender.className = "site-chat-sender";
    sender.textContent = role === "user" ? "You" : "Nik";
    meta.appendChild(sender);
    message.appendChild(meta);

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    message.appendChild(paragraph);

    const safeLinks = (links || []).filter(function (item) {
      return (
        item &&
        typeof item.label === "string" &&
        typeof item.href === "string" &&
        ((item.href.charAt(0) === "/" && item.href.charAt(1) !== "/") ||
          item.href.indexOf("https://gbcramgarh.in/") === 0)
      );
    });

    if (safeLinks.length) {
      const linkList = document.createElement("div");
      linkList.className = "site-chat-links";

      safeLinks.forEach(function (item) {
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        if (item.href.indexOf("https://") === 0) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        linkList.appendChild(link);
      });

      message.appendChild(linkList);
    }

    messages.appendChild(message);
    if (persist !== false) {
      conversation.push({ role: role, text: text, links: safeLinks });
      saveConversation();
    }
    scrollToLatest();
    return message;
  }

  function scrollToLatest() {
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className =
      "site-chat-message site-chat-message-assistant site-chat-typing";
    typing.setAttribute("aria-label", "Nik is typing");

    const meta = document.createElement("div");
    meta.className = "site-chat-message-meta";
    const avatar = document.createElement("img");
    avatar.className = "site-chat-avatar";
    avatar.src = "/images/botPhoto.png";
    avatar.alt = "";
    meta.appendChild(avatar);

    const sender = document.createElement("span");
    sender.className = "site-chat-sender";
    sender.textContent = "Nik";
    meta.appendChild(sender);
    typing.appendChild(meta);

    const dots = document.createElement("span");
    dots.className = "site-chat-typing-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<i></i><i></i><i></i>";
    typing.appendChild(dots);

    messages.appendChild(typing);
    scrollToLatest();
    return typing;
  }

  if (conversation.length) {
    messages.replaceChildren();
    conversation.forEach(function (entry) {
      addMessage(entry.role, entry.text, entry.links, false);
    });
    if (suggestions) {
      suggestions.hidden = true;
      messages.appendChild(suggestions);
    }
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function answerFor(question) {
    const text = question.toLowerCase().replace(/\s+/g, " ").trim();
    const seatLinks = [{ label: "Open seat matrix ↗", href: "/seat-matrix" }];

    // --- Who built me / this website ---
    if (
      /who\s+(built|made|created|developed|designed|coded|programmed|owns)|your\s+(creator|developer|maker|owner)|built\s+(me|this)/.test(
        text,
      )
    ) {
      return {
        text: "My college buddy Anamika built me! \u{1F604}",
      };
    }

    // --- Who are you / name ---
    if (
      /who are you|your name|what are you called|what should i call you/.test(
        text,
      )
    ) {
      return {
        text: "I'm Nik, the college's chat buddy! Ask me about programmes, seats, BCA papers, directions, or recognition.",
      };
    }

    // --- Are you a human / AI / real ---
    if (
      /are you (a )?(human|real|robot|bot|ai|person)|real person|talking to a (bot|human)/.test(
        text,
      )
    ) {
      return {
        text: "I'm a chatbot, not a human! I run on simple rules, so I only know what's been set up for me. \u{1F916}",
      };
    }

    // --- How are you ---
    if (
      /how are you|how r u|kaise ho|kya haal|how do you do|what'?s up|wassup/.test(
        text,
      )
    ) {
      return {
        text: "Doing great, thanks for asking! \u{1F604} Ready to help. What do you want to know?",
      };
    }

    // --- Where do you live / are you from ---
    if (/where (do|are) you (live|from|stay)|your (home|house)/.test(text)) {
      return {
        text: "I live on the college website, rent-free and with zero electricity bills. \u{1F60E}",
      };
    }

    // --- Jokes ---
    if (/joke|make me laugh|something funny|bore|bored/.test(text)) {
      return {
        text: pickOne([
          "Why do programmers prefer dark mode? Because light attracts bugs! \u{1F41B}",
          "Why did the student bring a ladder to the BCA class? To reach the higher-level language! \u{1F604}",
          "I'd tell you a UDP joke, but you might not get it. \u{1F605}",
          "There are 10 kinds of people: those who understand binary and those who don't. \u{1F913}",
        ]),
      };
    }

    // --- Love / girlfriend / boyfriend ---
    if (
      /girlfriend|boyfriend|\bgf\b|\bbf\b|love me|marry me|date me|crush|single/.test(
        text,
      )
    ) {
      return {
        text: pickOne([
          "My relationship status: connected to Wi-Fi. That's the only commitment I can handle. \u{1F605}",
          "Sorry, I'm already in a serious relationship with my keywords. \u{1F494}",
        ]),
      };
    }

    // --- Bunking / attendance ---
    if (/bunk|attendance|skip (class|college)|proxy/.test(text)) {
      return {
        text: "I never miss a day, but attendance rules are best checked with the college directly. And no proxy for me either! \u{1F604}",
        links: [
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    // --- Exams / will I pass ---
    if (
      /will i pass|going to pass|will i fail|am i going to fail|exam tips|how to (pass|score|study)/.test(
        text,
      )
    ) {
      return {
        text: "I can't predict results, but I can tell you that solving previous papers helps a lot! \u{1F4DA}",
        links: [{ label: "Browse BCA papers ↗", href: "/pyq/bca" }],
      };
    }

    // --- Hostel / canteen / placement / timings (not verified) ---
    if (
      /hostel|canteen|mess|food|placement|job|package|timing|time table|timetable|holiday/.test(
        text,
      )
    ) {
      return {
        text: "I don't have verified details on that yet, and I'd hate to guess. Please check with the college directly.",
        links: [
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    // --- Thanks ---
    if (/\b(thanks|thank you|thx|shukriya|dhanyavad|dhanyawad)\b/.test(text)) {
      return {
        text: pickOne([
          "Anytime! \u{1F60A} Come back if you need anything else.",
          "You're welcome! Happy to help. \u{1F64C}",
        ]),
      };
    }

    // --- Bye ---
    if (/\b(bye|goodbye|see you|tata|alvida|good night)\b/.test(text)) {
      return {
        text: "Bye! \u{1F44B} Take care, and come back anytime.",
      };
    }

    if (/\b(hi|hello|hey|namaste|hii|hlo)\b/.test(text)) {
      return {
        text: "Hey! \u{1F44B} What can I help you with—courses, seats, BCA papers, directions, or recognition?",
      };
    }

    if (/seat|capacity|vacan/.test(text)) {
      const totals = seatTotals
        .map(function (row) {
          return row[0] + ": " + row[1];
        })
        .join(" · ");
      return {
        text: "Sure! Here's the published seat count: " + totals + ".",
        links: seatLinks,
      };
    }

    if (/syllabus|curriculum/.test(text)) {
      return {
        text: "The BCA syllabus is available to view or download as a PDF.",
        links: [
          { label: "View BCA syllabus ↗", href: "/programs/bca#syllabus" },
        ],
      };
    }

    if (/assignment|front page|cover page/.test(text)) {
      return {
        text: "The BCA resources page has a combined PDF with two assignment front pages, for use with any semester.",
        links: [
          {
            label: "Assignment front pages ↗",
            href: "/programs/bca#assignment-front-page",
          },
        ],
      };
    }

    if (/uniform|dress code/.test(text)) {
      const isBCA = /\b(bca|BCA)\b/.test(text);
      const isBBA = /\b(bba|BBA)\b/.test(text);
      const isNoUniform = /\b(ba|bcom|b\.com|bsci|bsci|BSci|BA|BCom)\b/.test(text);

      // 1. BCA: uniform exists
      if (isBCA) {
        return {
          text: "The listed BCA uniform is black pants, white shirt, black shoes and white socks for boys; black salwar, white suit and black dupatta for girls. The listed boys' outfit is also an option.",
          links: [
            {
              label: "View BCA uniform details ↗",
              href: "/programs/bca#uniform",
            },
          ],
        };
      }

      // 2. BBA: no data found
      if (isBBA) {
        return {
          text: "I couldn't find any uniform details for BBA. The official college website is the safest place to check.",
          links: [
            {
              label: "Official college website ↗",
              href: "https://gbcramgarh.in/",
              external: true,
            },
          ],
        };
      }

      // 3. BA / BCom / BSc: no uniform
      if (isNoUniform) {
        return {
          text: "There is no uniform for BA, BCom and BSc students.",
        };
      }

      // No program mentioned
      return {
        text: "Uniform details depend on the program. BCA has a listed uniform, BA, BCom and BSc have none, and I have no data for BBA. Which program are you asking about?",
      };
    }

    if (
      /\bbca\b/.test(text) &&
      /how many semesters|number of semesters/.test(text)
    ) {
      return {
        text: "BCA is a three-year programme across six semesters. The current question-paper archive includes Semesters 1 and 2.",
        links: [{ label: "BCA resources ↗", href: "/programs/bca" }],
      };
    }

    if (/\bbca\b/.test(text) && /duration|how long|years/.test(text)) {
      return {
        text: "BCA is a three-year undergraduate programme across six semesters.",
        links: [{ label: "BCA resources ↗", href: "/programs/bca" }],
      };
    }

    if (
      /question paper|previous year|\bpyq\b|exam paper|solutions?/.test(text)
    ) {
      return {
        text: "BCA papers and solutions are available for Semester 1 batches 2024–2027 and 2025–2028, and Semester 2 batch 2025–2028.",
        links: [{ label: "Browse BCA papers ↗", href: "/pyq/bca" }],
      };
    }

    if (
      /\b(bca|bba)\b/.test(text) &&
      /paper|semester|exam|download/.test(text)
    ) {
      return {
        text: "You can find BCA papers and solutions by semester and batch on this page.",
        links: [{ label: "Browse BCA papers ↗", href: "/pyq/bca" }],
      };
    }

    if (
      /recognition|approval|ugc|aicte|affiliat|constituent|university/.test(
        text,
      )
    ) {
      return {
        text: "The site lists Gram Bharti College as a constituent college of Veer Kunwar Singh University and provides UGC/AICTE verification links.",
        links: [
          { label: "View recognition info ↗", href: "/#recognition-section" },
        ],
      };
    }

    if (/where|location|address|direction|reach|map/.test(text)) {
      return {
        text: "It's in Ramgarh, Kaimur, Bihar — PIN 821110. Open the college map for directions. \u{1F4CD}",
        links: [{ label: "View college map ↗", href: "/#college-map" }],
      };
    }

    if (/fee|fees|cost|tuition/.test(text)) {
      return {
        text: "For the 2025–2028 batch, estimated semester fees total ₹68,500–₹80,500. Including exams at ₹1,000 per semester, the estimate is ₹74,500–₹86,500 if that rate stays unchanged. These are not official current rates; confirm the exact fees with the BCA HOD.",
        links: [
          { label: "View BCA fee estimate ↗", href: "/programs/bca#fees" },
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    if (/admission|apply|application|scholarship|eligib/.test(text)) {
      return {
        text: "I couldn't verify the latest admission, fee, eligibility, or scholarship details here. Best to check with the college directly.",
        links: [
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    if (
      /program|course|degree|\bbca\b|\bbba\b|\bb\.?a\.?\b|\bb\.?sc\.?\b|\bb\.?com\.?\b/.test(
        text,
      )
    ) {
      return {
        text: "Here's the quick overview: B.A., B.Sc., and B.Com. are listed as four-year programmes; BCA and BBA as three-year programmes.",
        links: [
          { label: "Explore programmes ↗", href: "/programs" },
          { label: "BCA resources ↗", href: "/programs/bca" },
        ],
      };
    }

    // Phone
    if (/phone|telephone|mobile|call|contact number/.test(text)) {
      return {
        text: "I don't have a verified phone number listed here. The official college website is the safest place to check.",
        links: [
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    // Email
    if (/email|e-mail|mail/.test(text)) {
      return {
        text: "You can email the college at gbcramgarh@gmail.com.",
        links: [
          {
            label: "Send an email ✉",
            href: "mailto:gbcramgarh@gmail.com",
            external: false,
          },
        ],
      };
    }

    // General "contact" with no specific type
    if (/contact/.test(text)) {
      return {
        text: "You can email the college at gbcramgarh@gmail.com. I don't have a verified phone number, so please check the official website for that.",
        links: [
          {
            label: "Send an email ✉",
            href: "mailto:gbcramgarh@gmail.com",
            external: false,
          },
          {
            label: "Official college website ↗",
            href: "https://gbcramgarh.in/",
            external: true,
          },
        ],
      };
    }

    return {
      text: "Hmm, I don't know what you asked. But I can help with programmes, seat counts, BCA papers, directions, and recognition.",
      links: [
        { label: "Programmes", href: "/programs" },
        { label: "Seat matrix", href: "/seat-matrix" },
        { label: "BCA papers", href: "/pyq/bca" },
      ],
    };
  }

  function sendQuestion(question, fromVoice) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isReplying) return;

    if (fromVoice) setVoiceOutput(true);
    addMessage("user", cleanQuestion);
    playMessageSound("sent");
    if (suggestions) suggestions.hidden = true;
    input.value = "";
    isReplying = true;
    input.disabled = true;
    if (micButton) micButton.disabled = true;
    form.classList.add("site-chat-form-is-replying");

    const typing = showTyping();
    const answer = answerFor(cleanQuestion);

    window.setTimeout(function () {
      typing.remove();
      addMessage("assistant", answer.text, answer.links);
      playMessageSound("received");
      speakReply(answer.text);
      isReplying = false;
      input.disabled = false;
      if (micButton) micButton.disabled = !SpeechRecognition;
      form.classList.remove("site-chat-form-is-replying");
      if (!fromVoice) input.focus();
    }, 450);
  }

  function setVoiceStatus(text) {
    if (!voiceStatus) return;
    voiceStatus.textContent = text;
    voiceStatus.hidden = !text;
  }

  let dragState = null;
  let suppressToggleClick = false;

  toggle.addEventListener("pointerdown", function (event) {
    if (!chatbot || !panel.hidden || !event.isPrimary || event.button !== 0)
      return;

    const bounds = chatbot.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: bounds.left,
      top: bounds.top,
      offsetX: chatbotOffsetX,
      offsetY: chatbotOffsetY,
      moved: false,
    };
    event.preventDefault();
    toggle.setPointerCapture(event.pointerId);
  });

  toggle.addEventListener("pointermove", function (event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(deltaX, deltaY) < 5) return;

    dragState.moved = true;
    chatbot.classList.add("is-dragging");
    const left = Math.max(
      0,
      Math.min(
        window.innerWidth - chatbot.offsetWidth,
        dragState.left + deltaX,
      ),
    );
    const top = Math.max(
      0,
      Math.min(
        window.innerHeight - chatbot.offsetHeight,
        dragState.top + deltaY,
      ),
    );
    chatbotOffsetX = dragState.offsetX + left - dragState.left;
    chatbotOffsetY = dragState.offsetY + top - dragState.top;
    chatbot.style.setProperty("--chatbot-offset-x", chatbotOffsetX + "px");
    chatbot.style.setProperty("--chatbot-offset-y", chatbotOffsetY + "px");
    event.preventDefault();
  });

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    if (dragState.moved) {
      suppressToggleClick = true;
      chatbot.classList.remove("is-dragging");
      window.setTimeout(function () {
        suppressToggleClick = false;
      }, 0);
    }
    dragState = null;
  }

  toggle.addEventListener("pointerup", endDrag);
  toggle.addEventListener("pointercancel", endDrag);

  toggle.addEventListener("click", function () {
    if (suppressToggleClick) return;
    setOpen(panel.hidden);
  });

  close.addEventListener("click", function () {
    setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendQuestion(input.value);
  });

  if (voiceOutputButton) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      voiceOutputButton.disabled = true;
      voiceOutputButton.title =
        "Spoken replies are not supported in this browser";
      voiceOutputButton.setAttribute("aria-label", voiceOutputButton.title);
    }
    voiceOutputButton.addEventListener("click", function () {
      setVoiceOutput(!voiceOutputEnabled);
    });
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", function () {
      soundEnabled = !soundEnabled;
      soundToggle.setAttribute("aria-pressed", String(soundEnabled));
      soundToggle.setAttribute(
        "aria-label",
        soundEnabled ? "Mute chat sounds" : "Enable chat sounds",
      );
      soundToggle.title = soundEnabled
        ? "Mute chat sounds"
        : "Enable chat sounds";
      soundToggle.innerHTML = soundEnabled
        ? '<i class="fa-solid fa-bell" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bell-slash" aria-hidden="true"></i>';
    });
  }

  if (micButton) {
    if (!SpeechRecognition) {
      micButton.disabled = true;
      micButton.title = "Voice input is not supported in this browser";
      micButton.setAttribute("aria-label", micButton.title);
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.addEventListener("start", function () {
        isListening = true;
        micButton.setAttribute("aria-pressed", "true");
        micButton.setAttribute("aria-label", "Stop voice input");
        micButton.title = "Stop voice input";
        setVoiceStatus(
          "Listening. Speak your question, then tap the microphone to stop.",
        );
      });

      recognition.addEventListener("result", function (event) {
        const transcript = event.results[0][0].transcript.trim();
        setVoiceStatus("");
        sendQuestion(transcript, true);
      });

      recognition.addEventListener("error", function (event) {
        const message =
          event.error === "not-allowed"
            ? "Microphone access was blocked. Allow microphone access in your browser settings."
            : event.error === "no-speech"
              ? "No speech detected. Tap the microphone to try again."
              : "Voice input could not start. Please try again.";
        setVoiceStatus(message);
      });

      recognition.addEventListener("end", function () {
        isListening = false;
        micButton.setAttribute("aria-pressed", "false");
        micButton.setAttribute("aria-label", "Start voice input");
        micButton.title = "Start voice input";
      });

      micButton.addEventListener("click", function () {
        if (isListening) {
          recognition.stop();
          return;
        }
        setVoiceStatus("");
        try {
          recognition.start();
        } catch (error) {
          setVoiceStatus("Voice input could not start. Please try again.");
        }
      });
    }
  }

  if (suggestions) {
    suggestions.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-question]");
      if (button) sendQuestion(button.dataset.question);
    });
  }
})();

// Global State Management
const AppState = {
  currentStage: 'chat',
  userRole: null,
  userData: {
    name: '',
    mobile: '',
    email: '',
    specialization: ''
  },
  language: 'English',
  messages: [],
  currentMainHeading: null,
  therapies: [],
  questionsAsked: [],
  sessionId: null,
  awaitingInput: null,
  mainHeadings: [],
  currentHeadingQuestions: [],
  currentTherapy: null
};

let API_BASE_URL = '';
let configLoaded = false;

async function loadConfig() {
  if (configLoaded) return;
  try {
    const response = await fetch('/config');
    const config = await response.json();
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !config.API_BASE_URL) {
      API_BASE_URL = '';
    } else {
      API_BASE_URL = config.API_BASE_URL;
      if (API_BASE_URL.endsWith('/')) {
        API_BASE_URL = API_BASE_URL.slice(0, -1);
      }
    }
    configLoaded = true;
    console.log('Loaded API base URL:', API_BASE_URL);
  } catch (err) {
    console.error('Failed to load config', err);
    API_BASE_URL = '';
  }
}
loadConfig(); // Call this before making API requests

// Language mappings for consistent translation
const LanguageText = {
  English: {
    therapy_prompt: 'Please select a patch below:',
    therapy_selected: 'Great choice! Here are the topics about <strong>{brand}</strong>:',
    welcome: 'Hello! 👋 I’m <strong>Mantra Bot</strong>, your smart companion from <strong>PatchMantra</strong>—bringing you science-backed, hassle-free patch therapy for relief, wellness and recovery. Let’s start with a few quick details.',
    greeting: 'Great! Nice to meet you. 👋\nWhat\'s your name? ',
    mobile_prompt: 'Hello <strong>{name}</strong>! 😊\nPlease enter your mobile number:',
    mobile_invalid: 'Please enter a valid mobile number:',
    name_required: 'Name is required. Please enter your name:',
    thank_you: 'Perfect thank you,<strong> {name}</strong>! \nYou’re just one step away from discovering the power of Patch Therapy! ',
    role_invalid: 'Please select either "Doctor" or "Consumer" to continue.',
    questions_about: 'Here are all the questions about <strong>{category}</strong>:',
    all_completed: 'You\'ve explored all questions in this category! 🎉',
    back_to_main: 'Here are the main topics:',
    error_loading: 'Sorry, I had trouble loading the questions. Please try again.',
    error_answer: 'Sorry, I had trouble getting the answer. Please try again.',
    error_technical: 'Sorry, I\'m experiencing technical difficulties. Please try again.',
    speech_error: 'Could not understand your speech. Please try again.',
    back_therapy: 'Back to Therapies',
    go_back: 'Back to Main Topics',
    specialization_prompt: 'Please select your specialization:',
    specify_specialization: 'Please specify your specialization:',
    select_one: 'Please choose one of the topics below:',
    ai_disclaimer: 'Mantra Bot can make mistakes. Verify important medical information with a doctor.'
  },
  Hindi: {
    therapy_prompt: 'कृपया नीचे दिए गए पैच का चयन करें:',
    therapy_selected: 'बहुत अच्छा चयन! <strong>{brand}</strong> के बारे में विषय यहाँ हैं:',
    welcome: 'नमस्ते! 👋 मैं हूँ <strong>मंत्रा बॉट</strong>, आपका स्मार्ट साथी <strong>पैचमंत्रा</strong> से — जो आपको विज्ञान-आधारित, आसान और प्रभावी पैच थेरेपी के माध्यम से राहत, स्वास्थ्य और पुनर्प्राप्ति प्रदान करता है। चलिए कुछ त्वरित विवरणों के साथ शुरू करते हैं!',
    greeting: 'बहुत बढ़िया! आपसे मिलकर खुशी हुई। 👋\nआपका नाम क्या है? ',
    mobile_prompt: 'नमस्ते <strong>{name}</strong>! 😊\nकृपया अपना मोबाइल नंबर दर्ज करें:',
    mobile_invalid: 'कृपया एक वैध मोबाइल नंबर दर्ज करें:',
    name_required: 'नाम आवश्यक है। कृपया अपना नाम दर्ज करें:',
    thank_you: 'धन्यवाद, <strong>{name}</strong>! \nआप पैच थेरेपी की शक्ति जानने से बस एक कदम दूर हैं!',
    role_invalid: 'कृपया जारी रखने के लिए "डॉक्टर" या "उपभोक्ता" का चयन करें।',
    questions_about: '<strong>{category}</strong> के बारे में सभी प्रश्न यहाँ हैं:',
    all_completed: 'आपने इस श्रेणी के सभी प्रश्न देख लिए हैं! 🎉',
    back_to_main: 'यहाँ मुख्य विषय हैं:',
    error_loading: 'मुझे प्रश्न लोड करने में परेशानी हुई। कृपया पुनः प्रयास करें।',
    error_answer: 'मुझे उत्तर प्राप्त करने में परेशानी हुई। कृपया पुनः प्रयास करें।',
    error_technical: 'मुझे तकनीकी कठिनाई हो रही है। कृपया पुनः प्रयास करें।',
    speech_error: 'आपकी आवाज़ समझ नहीं आई। कृपया पुनः प्रयास करें।',
    go_back: 'मुख्य विषयों पर वापस जाएं',
    back_therapy: 'थेरेपी पर वापस जाएं',
    specialization_prompt: 'कृपया अपनी विशेषज्ञता चुनें:',
    specify_specialization: 'कृपया अपनी विशेषज्ञता बताएं:',
    select_one: 'कृपया नीचे दिए गए विषयों में से एक चुनें:',
    ai_disclaimer: 'मंत्रा बॉट से गलतियाँ हो सकती हैं। महत्वपूर्ण चिकित्सीय जानकारी की पुष्टि डॉक्टर से करें।'
  },
  Telugu: {
    therapy_prompt: 'దయచేసి క్రింద ఉన్న ప్యాచ్‌ను ఎంచుకోండి: ',
    therapy_selected: 'గొప్ప ఎంపిక! <strong>{brand}</strong> గురించి అంశాలు ఇక్కడ ఉన్నాయి:',
    welcome: 'హలో! 👋 నేను <strong>మంత్రా బాట్</strong>, <strong>ప్యాచ్‌మంత్రా</strong> నుండి మీ సహాయకుడు.సులభమైన ప్యాచ్ థెరపీతో ఉపశమనం మరియు ఆరోగ్యాన్ని అందించడానికి సిద్ధంగా ఉన్నాను. కొన్ని తక్షణ వివరాలతో ప్రారంభిద్దాం!',
    greeting: 'అద్భుతం! మిమ్మల్ని కలవడం ఆనందంగా ఉంది. 👋\nమీ పేరు ఏమిటి? ',
    mobile_prompt: 'హలో <strong>{name}</strong>! 😊\nదయచేసి మీ మొబైల్ నంబర్ ఎంటర్ చేయండి:',
    mobile_invalid: 'దయచేసి చెల్లుబాటు అయ్యే మొబైల్ నంబర్ ఎంటర్ చేయండి:',
    name_required: 'పేరు అవసరం. దయచేసి మీ పేరు ఎంటర్ చేయండి:',
    thank_you: 'ధన్యవాదాలు, <strong>{name}</strong>! \nమీరు ప్యాచ్ థెరపీ శక్తిని తెలుసుకోవడానికి కేవలం ఒక అడుగు దూరంలో ఉన్నారు!',
    role_invalid: 'దయచేసి కొనసాగించడానికి "డాక్టర్" లేదా "వినియోగదారు"ని ఎంచుకోండి.',
    questions_about: '<strong>{category}</strong> గురించి అన్ని ప్రశ్నలు ఇవి:',
    all_completed: 'మీరు ఈ వర్గంలోని అన్ని ప్రశ్నలను అన్వేషించారు! 🎉',
    back_to_main: 'ఇవి ప్రధాన అంశాలు:',
    back_therapy: 'థెరపీలకు తిరిగి వెళ్ళండి',
    error_loading: 'క్షమించండి, ప్రశ్నలను లోడ్ చేయడంలో ఇబ్బంది ఉంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    error_answer: 'క్షమించండి, సమాధానం పొందడంలో ఇబ్బంది ఉంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    error_technical: 'క్షమించండి, నేను సాంకేతిక ఇబ్బందులను ఎదుర్కొంటున్నాను. దయచేసి మళ్లీ ప్రయత్నించండి.',
    speech_error: 'మీ మాటలు అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',
    go_back: 'ప్రధాన అంశాలకు తిరిగి వెళ్లండి',
    specialization_prompt: 'దయచేసి మీ విశేషణను ఎంచుకోండి:',
    specify_specialization: 'దయచేసి మీ విశేషణను తెలియజేయండి:',
    select_one: 'దయచేసి క్రింద ఇచ్చిన అంశాలలో ఒకటిని ఎంచుకోండి:',
    ai_disclaimer: 'మంత్రా బాట్ పొరపాట్లు చేయవచ్చు. ముఖ్యమైన వైద్య సమాచారాన్ని వైద్యునితో ధృవీకరించుకోండి.'
  }
};

function updateDisclaimer() {
  const disclaimerEl = document.getElementById('ai-disclaimer');
  if (disclaimerEl) {
    disclaimerEl.innerHTML = `<span>${getText('ai_disclaimer')}</span>`;
  }
}

// Cross-browser compatibility checks
const BrowserSupport = {
  speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  fetch: !!window.fetch,
  localStorage: !!window.localStorage
};

function updateInputPanelVisibility() {
  const inputPanel = document.getElementById('input-panel');
  const inputContainer = document.getElementById('input-container');
  if (!inputPanel) return;

  inputPanel.style.display = 'flex';
  if (inputContainer) {
    inputContainer.style.display = AppState.userRole ? 'flex' : 'none';
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkBrowserSupport();
});

function initializeApp() {
  AppState.sessionId = generateSessionId();
  AppState.awaitingInput = 'language';
  updateDisclaimer();

  setTimeout(() => {
    addMessage('assistant', 'Please select your preferred language:');
    showLanguageSelectionInChat();
  }, 500);

  updateInputPanelVisibility();
}

function selectLanguage(lang) {
  AppState.language = lang;
  AppState.therapies = [];
  AppState.mainHeadings = [];
  AppState.currentHeadingQuestions = [];
  AppState.questionsAsked = [];
  AppState.selectedTherapies = [];
  AppState.currentTherapy = null;

  AppState.currentMainHeading = null;
  updateDisclaimer();

  const select = document.getElementById('language-select');
  if (select) select.value = lang;

  const langContainer = document.querySelector('.language-selection-container');
  if (langContainer) langContainer.remove();

  const inputLangSelector = document.getElementById('input-language-selector');
  // if (inputLangSelector) {
  //   inputLangSelector.style.display = 'block';
  //   setTimeout(() => (inputLangSelector.style.display = 'none'), 2000);
  // }

  addMessage('user', lang);
  smoothScrollUserResponseToTop();

  setTimeout(() => {
    addMessage('assistant', getText('welcome'));
    setTimeout(() => {
      showRoleSelection();
      AppState.awaitingInput = 'role';
    }, 500);
  }, 300);
}

function showLanguageSelectionInChat() {
  const chatContainer = document.getElementById('chat-container');
  const langContainer = document.createElement('div');
  langContainer.className = 'language-selection-container';

  langContainer.innerHTML = `
  
    <div class="language-buttons common-container">
    
      <button class="role-button" onclick="selectLanguage('English')">English</button>
      <button class="role-button" onclick="selectLanguage('Hindi')">हिन्दी</button>
      <button class="role-button" onclick="selectLanguage('Telugu')">తెలుగు</button>
    </div>
   
  `;
  chatContainer.appendChild(langContainer);
  autoScrollImmediate();
}

function checkBrowserSupport() {
  if (!BrowserSupport.speechRecognition) {
    console.warn('⚠️ Voice input not supported in this browser');
  }
  console.log('✅ Browser compatibility check completed');
}

// Get localized text
function getText(key, replacements = {}) {
  let text = LanguageText[AppState.language][key] || LanguageText['English'][key] || key;
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`{${placeholder}}`, 'g'), value);
  }
  return text;
}

function smoothScrollUserResponseToTop() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;

  requestAnimationFrame(() => {
    const messages = chatContainer.querySelectorAll('.chat-message.user-message');
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage) {
      const offsetTop = lastUserMessage.offsetTop;
      chatContainer.scrollTo({ top: offsetTop - 20, behavior: 'smooth' });
    }
  });
}

// Auto Scroll
function autoScroll() {
  requestAnimationFrame(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      const scrollHeight = chatContainer.scrollHeight;
      const clientHeight = chatContainer.clientHeight;
      const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
      if (scrollHeight > clientHeight) {
        chatContainer.scrollTo({ top: maxScrollTop, behavior: 'smooth' });
      }
    }
  });
}
function autoScrollSmooth() {
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    const scrollHeight = chatContainer.scrollHeight;
    const clientHeight = chatContainer.clientHeight;
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
    if (scrollHeight > clientHeight) {
      chatContainer.scrollTo({ top: maxScrollTop, behavior: 'smooth' });
    }
  }
}
function autoScrollImmediate() {
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    });
  }
}

// Role selection
function showRoleSelection() {
  const chatContainer = document.getElementById('chat-container');
  const roleContainer = document.createElement('div');
  roleContainer.className = 'role-selection-container';
  roleContainer.innerHTML = `
    <div class="role-buttons common-container">
      <button class="role-button" onclick="selectRole('Doctor')">
        ${AppState.language === 'Hindi' ? 'मैं डॉक्टर हूँ' : AppState.language === 'Telugu' ? 'నేను డాక్టర్‌ను' : 'I am Doctor'}
      </button>
      <button class="role-button" onclick="selectRole('Consumer')">
        ${AppState.language === 'Hindi' ? 'मैं उपभोक्ता हूँ' : AppState.language === 'Telugu' ? 'నేను వినియోగదారుడిని' : 'I am Consumer'}
      </button>
    </div>
  `;
  chatContainer.appendChild(roleContainer);
  autoScrollImmediate();
}

function selectRole(role) {

  AppState.userRole = role;
  AppState.awaitingInput = 'name';

  const roleContainer = document.querySelector('.role-selection-container');
  if (roleContainer) roleContainer.remove();

  const roleText =
    AppState.language === 'Hindi'
      ? role === 'Doctor' ? 'डॉक्टर' : 'उपभोक्ता'
      : AppState.language === 'Telugu'
        ? role === 'Doctor' ? 'డాక్టర్' : 'వినియోగదారు'
        : `I am a ${role}`;
  addMessage('user', roleText);

  const namePrompt = getText('greeting', { role });
  addMessage('assistant', namePrompt);
  autoScrollSmooth();
  updateInputPanelVisibility();
}

// Input flow
function processUserInput(input) {
  const trimmedInput = input.trim();
  if (!trimmedInput) return;

  switch (AppState.awaitingInput) {
    case 'role':
      if (
        trimmedInput.toLowerCase().includes('doctor') ||
        trimmedInput.toLowerCase().includes('doc') ||
        trimmedInput.includes('डॉक्टर') ||
        trimmedInput.includes('డాక్టర్')
      ) {
        selectRole('Doctor');
      } else if (
        trimmedInput.toLowerCase().includes('consumer') ||
        trimmedInput.includes('उपभोक्ता') ||
        trimmedInput.includes('उपभोक्ता') ||
        trimmedInput.includes('వినియోగదారు')
      ) {
        selectRole('Consumer');
      } else {
        addMessage('assistant', getText('role_invalid'));
      }
      break;

    case 'name':
      if (trimmedInput.length < 1) {
        addMessage('assistant', getText('name_required'));
        return;
      }
      AppState.userData.name = trimmedInput;

      if (AppState.userRole === 'Doctor') {
        AppState.awaitingInput = 'specialization';
        addMessage('assistant', getText('specialization_prompt'));
        showSpecializationOptions();
      } else {
        AppState.awaitingInput = 'mobile';
        addMessage('assistant', getText('mobile_prompt', { name: trimmedInput }));
        autoScrollImmediate();
      }
      break;

    case 'specialization':
      const specContainer = document.querySelector('.specialization-selection-container');
      if (specContainer) specContainer.remove();
      if (trimmedInput.toLowerCase() === 'other') {
        AppState.awaitingInput = 'custom_specialization';
        addMessage('assistant', getText('specify_specialization'));
      } else {
        AppState.userData.specialization = trimmedInput;
        setTimeout(() => {
          AppState.awaitingInput = 'mobile';
          addMessage('assistant', getText('mobile_prompt', { name: AppState.userData.name }));
          autoScrollImmediate();
        }, 800);
        saveUserData();
      }
      break;

    case 'custom_specialization':
      AppState.userData.specialization = trimmedInput;
      setTimeout(() => {
        AppState.awaitingInput = 'mobile';
        addMessage('assistant', getText('mobile_prompt', { name: AppState.userData.name }));
        autoScrollImmediate();
      }, 800);
      saveUserData();
      break;

    case 'mobile':
      if (!validateMobileNumber(trimmedInput)) {
        addMessage('assistant', getText('mobile_invalid'));
        return;
      }
      AppState.userData.mobile = trimmedInput;
      AppState.awaitingInput = null;

      saveUserData();
      AppState.awaitingInput = 'therapy';
      addMessage('assistant', getText('thank_you', { name: AppState.userData.name }));
      autoScrollImmediate();
      setTimeout(() => {
        fetchTherapies().then(() => {
          addMessage('assistant', getText('therapy_prompt'));
          showTherapyButtons(AppState.therapies);
        });
      }, 800);
      break;

    default:
      handleGeneralInput(trimmedInput);
      break;
  }
}

function showSpecializationOptions() {
  const chatContainer = document.getElementById('chat-container');
  const specContainer = document.createElement('div');
  specContainer.className = 'specialization-selection-container';

  const optionsByLang = {
    English: ['Cardiology', 'Dermatology', 'Psychiatry', 'Pulmonology', 'General Medicine', 'Other'],
    Hindi: ['हृदय रोग विशेषज्ञ', 'त्वचा रोग विशेषज्ञ', 'मनोचिकित्सक', 'फेफड़े रोग विशेषज्ञ', 'सामान्य चिकित्सा', 'अन्य'],
    Telugu: ['హృదయ రోగ వైద్యుడు', 'చర్మ రోగ వైద్యుడు', 'మనోవైద్యుడు', 'ఉపిరితిత్తుల వైద్యుడు', 'సాధారణ వైద్యం', 'ఇతర']
  };

  const specializations = optionsByLang[AppState.language] || optionsByLang.English;

  specContainer.innerHTML = `
    <div class="specialization-buttons common-container">
      ${specializations.map(s => `<button class="specialization-button role-button" onclick="selectSpecialization('${s}')">${s}</button>`).join('')}
    </div>
  `;
  chatContainer.appendChild(specContainer);
  // autoScrollImmediate();
  smoothScrollUserResponseToTop();
}


function selectSpecialization(spec) {
  const specContainer = document.querySelector('.specialization-selection-container');
  if (specContainer) specContainer.remove();

  addMessage('user', spec);
  smoothScrollUserResponseToTop();


  // Check for "Other" in all languages
  const otherOptions = ['Other', 'अन्य', 'ఇతర'];

  if (otherOptions.includes(spec)) {
    AppState.awaitingInput = 'custom_specialization';
    addMessage('assistant', getText('specify_specialization'));
  } else {
    AppState.userData.specialization = spec;
    setTimeout(() => {
      AppState.awaitingInput = 'mobile';
      addMessage('assistant', getText('mobile_prompt', { name: AppState.userData.name }));
      autoScrollImmediate();
    }, 800);
    saveUserData();
  }
}


// Utilities
function validateMobileNumber(mobile) {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobile.length === 10 && mobileRegex.test(mobile);
}

// ---- THERAPIES → HEADINGS → QUESTIONS FLOW ----

// Fetch therapies
async function fetchTherapies() {
  showTypingAnimation();
  try {
    const resp = await fetch(`${API_BASE_URL}/api/get-therapies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: AppState.userRole,
        language: AppState.language,
        session_id: AppState.sessionId
      })
    });
    if (!resp.ok) throw new Error('HTTP error');
    const data = await resp.json();
    AppState.therapies = (data.therapies || []).map(t => {
      const title =
        AppState.language === 'Hindi' ? t.title_hi || t.title :
          AppState.language === 'Telugu' ? t.title_te || t.title :
            t.title;
      const description =
        AppState.language === 'Hindi' ? t.description_hi || t.description :
          AppState.language === 'Telugu' ? t.description_te || t.description :
            t.description; let imagePath = '';
      const key = t.key?.toLowerCase() || '';

      if (key.includes('nitof')) imagePath = 'static/images/nitof.png';
      else if (key.includes('hetriva')) imagePath = 'static/images/hetriva.png';
      else if (key.includes('trans')) imagePath = 'static/images/transd.png';
      else if (key.includes('k-plast') || key.includes('kplast')) imagePath = 'static/images/kplast.png';
      else imagePath = 'static/images/default.png'; // fallback image

      return { ...t, title, description, image: imagePath };
    });
  } catch (e) {
    addMessage('assistant', getText('error_technical'));
  }
  finally {
    hideTypingAnimation();
  }
}

// Show therapies
function showTherapyButtons() {
  AppState.currentStage = 'therapy';
  clearChatOptions();
  showTypingAnimation();
  const chatContainer = document.getElementById('chat-container');
  const div = document.createElement('div');
  div.className = 'therapy-selection-container';
  let html = '<div class="role-buttons therapy-container" style="display:flex;flex-direction:column;align-items:center;gap:12px;max-width: 20rem;">';
  AppState.therapies.forEach(t => {
    html += `
      <button class="role-button therapy-card" onclick="selectTherapy('${t.key}')" 
        style="display:flex;align-items:center;gap:12px;width:95%;padding:12px;border-radius:12px;background:#f7ebe7;border:1px solid #d7c4be;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <img src="${t.image}" alt="${t.title}" style="width:80px;height:auto;border-radius:8px;object-fit:contain;">
        <div style="text-align:left;flex:1;">
          <strong style="color:#5a2d1f;font-size:16px;">${AppState.language === 'Hindi' ? t.title_hi || t.title :
        AppState.language === 'Telugu' ? t.title_te || t.title : t.title}</strong><br>
          <small style="color:#5a2d1f;font-size:14px;">${AppState.language === 'Hindi' ? t.description_hi || t.description :
        AppState.language === 'Telugu' ? t.description_te || t.description : t.description}</small>
        </div>
      </button>
    `;
  });
  html += '</div>';
  div.innerHTML = html;
  chatContainer.appendChild(div);
  // autoScrollImmediate();
  hideTypingAnimation();
}

// On therapy selection
function selectTherapy(therapyKey) {
  const therapy = AppState.therapies.find(t => t.key === therapyKey);
  if (!therapy) return;

  AppState.currentTherapy = therapyKey;
   AppState.selectedTherapies.push({
    key: therapy.key,
    title: therapy.title,
    time: new Date().toISOString()
     });
     fetch(`${API_BASE_URL}/api/log-therapy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: AppState.sessionId,
      therapy_key: therapy.key,
      therapy_title: therapy.title,
      role: AppState.userRole,
      language: AppState.language,
      name: AppState.userData.name,
      mobile: AppState.userData.mobile
    })
  });

  const therapyContainer = document.querySelector('.therapy-selection-container');
  if (therapyContainer) therapyContainer.remove();

  addMessage('user', therapyKey);
  smoothScrollUserResponseToTop();

  const introByLang = {
    English: `Nice! Let’s explore the main topics for <strong>${therapyKey}</strong> therapy 👇`,
    Hindi: `बहुत बढ़िया! चलिए <strong>${therapyKey}</strong> थेरेपी के मुख्य विषयों को देखें 👇`,
    Telugu: `అద్భుతం! <strong>${therapyKey}</strong> థెరపీకి సంబంధించిన ప్రధాన అంశాలు చూడండి 👇`
  };
  addMessage('assistant', introByLang[AppState.language] || introByLang['English']);

  // Fetch & show headings
  // showTypingAnimation();
  fetchMainHeadings();
  smoothScrollUserResponseToTop();
  // hideTypingAnimation();
}

// Fetch main headings for selected therapy
async function fetchMainHeadings() {
  showTypingAnimation();
  try {
    const resp = await fetch(`${API_BASE_URL}/api/get-main-headings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: AppState.userRole,
        therapy: AppState.currentTherapy,
        language: AppState.language,
        session_id: AppState.sessionId
      })
    });
    if (!resp.ok) throw new Error('HTTP error');
    const data = await resp.json();
    AppState.mainHeadings = data.headings || [];
    showMainHeadingButtons(AppState.mainHeadings);
  } catch (e) {
    addMessage('assistant', getText('error_loading'));
    smoothScrollUserResponseToTop
  }
  finally {
    hideTypingAnimation();
  }
}

// SHOW MAIN HEADINGS (single clean version + Back to Therapies)
function showMainHeadingButtons(headings) {
  AppState.currentStage = 'main_headings';
  showTypingAnimation();
  clearChatOptions();

  const chatContainer = document.getElementById('chat-container');
  const container = document.createElement('div');
  container.className = 'main-heading-container';

  const buttonsWrapper = document.createElement('div');
  buttonsWrapper.className = 'main-heading-buttons common-container';

  // Create buttons with listeners (avoid inline quoting issues)
  headings.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'heading-button role-button';
    btn.textContent = AppState.language === 'Hindi' ? h.title_hi || h.title :
      AppState.language === 'Telugu' ? h.title_te || h.title :
        h.title; btn.addEventListener('click', () => selectMainHeading(h.key, h.title));
    buttonsWrapper.appendChild(btn);
    smoothScrollUserResponseToTop();
  });

  const navDiv = document.createElement('div');
  navDiv.className = 'nav-buttons';
  const backBtn = document.createElement('button');
  backBtn.className = 'back-button';
  backBtn.textContent = `← ${getText('back_therapy')}`;
  backBtn.addEventListener('click', goBackToTherapies);
  navDiv.appendChild(backBtn);
  smoothScrollUserResponseToTop();

  container.appendChild(buttonsWrapper);
  container.appendChild(navDiv);
  chatContainer.appendChild(container);
  smoothScrollUserResponseToTop();
  // autoScrollImmediate();
  hideTypingAnimation();
}

function goBackToTherapies() {
  clearChatOptions();
  AppState.currentTherapy = null;
  AppState.selectedTherapies = [];
  AppState.currentMainHeading = null;
  AppState.currentHeadingQuestions = [];
  AppState.questionsAsked = [];
  AppState.mainHeadings = [];
  addMessage('assistant', getText('therapy_prompt'));
  fetchTherapies().then(() => showTherapyButtons(AppState.therapies));
  smoothScrollUserResponseToTop();

}

// On heading selection → load questions
async function selectMainHeading(headingKey, headingTitle) {
  showTypingAnimation();
  AppState.currentMainHeading = headingKey;

  // Remove main heading container before loading questions
  const mainHeadingContainer = document.querySelector('.main-heading-container');
  if (mainHeadingContainer) mainHeadingContainer.remove();

  const categoryContainer = document.querySelector('.category-selection-container');
  if (categoryContainer) categoryContainer.remove();

  if (headingTitle) addMessage('user', headingTitle);
  smoothScrollUserResponseToTop();

  addMessage('assistant', getText('questions_about', { category: headingTitle || '' }));
  smoothScrollUserResponseToTop();

  try {
    const resp = await fetch(`${API_BASE_URL}/api/get-all-heading-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: AppState.userRole,
        therapy: AppState.currentTherapy,
        heading_key: headingKey,
        language: AppState.language
      })
    });

    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const data = await resp.json();

    if (data.questions && data.questions.length > 0) {
      AppState.currentHeadingQuestions = data.questions;
      showQuestionButtonsWithGoBack(data.questions);
    } else {
      addMessage('assistant', getText('error_loading'));
      showGoBackButton();
    }
  } catch (e) {
    console.error('Error fetching questions:', e);
    addMessage('assistant', getText('error_loading'));
    showGoBackButton();
  } finally {
    hideTypingAnimation();
  }
}


// Render question buttons + back
function showQuestionButtonsWithGoBack(questions) {
  AppState.currentStage = 'questions';
  showTypingAnimation();
  const chatContainer = document.getElementById('chat-container');
  const questionContainer = document.createElement('div');
  questionContainer.className = 'question-selection-container';

  const available = questions.filter(q => !AppState.questionsAsked.includes(q.id));

  if (available.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'question-buttons common-container';

    available.forEach(q => {
      const b = document.createElement('button');
      b.className = 'question-button role-button';
      b.textContent = AppState.language === 'Hindi' ? q.question_hi || q.question :
        AppState.language === 'Telugu' ? q.question_te || q.question :
          q.question;
      b.addEventListener('click', () => selectQuestionAndGetAnswer(q.id, encodeURIComponent(q.question)));
      wrapper.appendChild(b);
    });

    const navDiv = document.createElement('div');
    navDiv.className = 'nav-buttons';
    const backBtn = document.createElement('button');
    backBtn.className = 'back-button';
    backBtn.textContent = `← ${getText('go_back')}`;
    backBtn.addEventListener('click', goBackToMainHeadings);

    navDiv.appendChild(backBtn);

    questionContainer.appendChild(wrapper);
    questionContainer.appendChild(navDiv);
    hideTypingAnimation();
  } else {
    questionContainer.innerHTML = `
      <div class="question-buttons">
        <p style="text-align:center;padding:20px;color:#666;">${getText('all_completed')}</p>
        <button class="back-button" onclick="goBackToMainHeadings()">← ${getText('go_back')}</button>
      </div>`;
  }

  chatContainer.appendChild(questionContainer);
  // autoScrollImmediate();
  hideTypingAnimation();
}

// On question select → show answer
async function selectQuestionAndGetAnswer(questionId, questionText) {
  const questionContainer = document.querySelector('.question-selection-container');
  if (questionContainer) questionContainer.remove();

  const decodedQuestion = decodeURIComponent(questionText);
  addMessage('user', decodedQuestion);
  smoothScrollUserResponseToTop();

  AppState.questionsAsked.push(questionId);

  // Hide clicked button immediately (best-effort in case container still present)
  const btn = document.querySelector(`button[onclick*="'${questionId}'"]`);
  if (btn) btn.style.display = 'none';

  showTypingAnimation();

  try {
    const resp = await fetch(`${API_BASE_URL}/api/get-rephrased-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: AppState.userRole,
        therapy: AppState.currentTherapy,
        heading_key: AppState.currentMainHeading,
        question_id: questionId,
        language: AppState.language,
        session_id: AppState.sessionId
      })
    });

    const data = await resp.json();

    if (data.answer) {
      addMessage('assistant', data.answer);

      const remaining = AppState.currentHeadingQuestions.filter(q => !AppState.questionsAsked.includes(q.id));
      if (remaining.length > 0) {
        setTimeout(() => showQuestionButtonsWithGoBack(remaining), 600);
      } else {
        setTimeout(() => {
          addMessage('assistant', getText('all_completed'));
          showGoBackButton();
        }, 600);
      }
    } else {
      addMessage('assistant', getText('error_answer'));
      showGoBackButton();
    }
  } catch (e) {
    console.error('Error fetching answer:', e);
    addMessage('assistant', getText('error_answer'));
    showGoBackButton();
  } finally {
    hideTypingAnimation();
  }
}

// Back to headings from questions
function goBackToMainHeadings() {
  showTypingAnimation();
  // AppState.currentTherapy = null;
  AppState.currentMainHeading = null;
  AppState.currentHeadingQuestions = [];
  AppState.questionsAsked = [];
  // AppState.mainHeadings = [];
  const questionContainer = document.querySelector('.question-selection-container');
  if (questionContainer) questionContainer.remove();

  const backContainer = document.querySelector('.back-only-container');
  if (backContainer) backContainer.remove();

  AppState.currentMainHeading = null;
  AppState.currentHeadingQuestions = [];

  addMessage('user', getText('go_back'));
  smoothScrollUserResponseToTop();
  addMessage('assistant', getText('back_to_main'));
  

  setTimeout(() => {
    showTypingAnimation();  
    fetchMainHeadings();

    // ✅ Hide typing AFTER content is displayed
   
  }, 400);
}

function showGoBackButton() {
  const chatContainer = document.getElementById('chat-container');
  const backContainer = document.createElement('div');
  backContainer.className = 'back-only-container';
  backContainer.innerHTML = `
    <div class="back-only">
      <button class="back-button" onclick="goBackToMainHeadings()">← ${getText('go_back')}</button>
    </div>
  `;
  chatContainer.appendChild(backContainer);
  // autoScrollImmediate();
}

// ---- FREE TEXT CHAT (AI DETECTION ENABLED VIA BACKEND) ----

async function handleGeneralInput(input) {
  // showTypingAnimation();


  AppState.currentMainHeading = null;
  AppState.currentHeadingQuestions = [];


  // Remove unwanted containers
  const headingsContainer = document.querySelector('.category-selection-container');
  if (headingsContainer) headingsContainer.remove();

  // --- NEW CODE START ---
  // Detect what’s visible now
  const mainHeadingContainer = document.querySelector('.main-heading-container');
  const questionContainer = document.querySelector('.question-selection-container');

  let activeSection = null;
  if (mainHeadingContainer) {
    activeSection = 'main_headings';
  }

  if (questionContainer) {
    activeSection = 'questions';
  }



  // Avoid duplicate user message
  const last = AppState.messages[AppState.messages.length - 1];
  if (!last || last.role !== 'user' || last.content !== input) {
    addMessage('user', input);
    smoothScrollUserResponseToTop();
  }

  // Wait for AI response
  await generateResponse(input, activeSection);

}


async function generateResponse(query, activeSection = null) {
  if (!query) return;

  showTypingAnimation();

  try {
    const resp = await fetch(`${API_BASE_URL}/api/chat-nitof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        role: AppState.userRole,
        language: AppState.language,
        therapy: AppState.currentTherapy || null,
        session_id: AppState.sessionId
      })
    });

    const data = await resp.json();
    hideTypingAnimation();

    if (data.auto_select) {
      AppState.currentTherapy = data.auto_select;

      addMessage('assistant', data.response);

      // Directly load main headings of detected therapy
      await fetchMainHeadings();
      return;
    }

    if (data.response) {
      addMessage('assistant', data.response);
    } else {
      addMessage('assistant', getText('error_answer'));
    }

    // --- NEW CODE START ---
    // Restore main headings or questions after response
    if (activeSection === 'main_headings' && AppState.mainHeadings.length > 0) {
      setTimeout(() => showMainHeadingButtons(AppState.mainHeadings), 600);
    } else if (activeSection === 'questions' && AppState.currentHeadingQuestions.length > 0) {
      const remaining = AppState.currentHeadingQuestions.filter(
        q => !AppState.questionsAsked.includes(q.id)
      );
      setTimeout(() => showQuestionButtonsWithGoBack(remaining), 600);
    }
    // --- NEW CODE END ---

  } catch (error) {
    hideTypingAnimation();
    console.error('Error generating response:', error);
    addMessage('assistant', getText('error_answer'));
  } finally {
    // Forcefully hide typing indicator after everything settles
    setTimeout(() => {
      const typingDiv = document.getElementById('typing-indicator');
      if (typingDiv) typingDiv.style.display = 'none';
    }, 800); // wait a bit longer to ensure UI finished restoring
  }
}


// ---- Chat UI helpers ----

function addMessage(role, content) {
  AppState.messages.push({ role, content });
  renderMessages();
  smoothScrollUserResponseToTop();
  // setTimeout(() => (role === 'user' ? autoScrollSmooth() : autoScrollImmediate()), 50); 
}

function renderMessages() {
  const chatContainer = document.getElementById('chat-container');
  const existingMessages = chatContainer.querySelectorAll('.chat-message');
  existingMessages.forEach(msg => msg.remove());

  AppState.messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${msg.role}-message`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `message-bubble ${msg.role}-bubble`;

    if (msg.role === 'assistant') {
      const botIcon = document.createElement('div');
      botIcon.className = 'bot-icon';
      bubbleDiv.appendChild(botIcon);

      const imgEl = document.createElement('img');
      imgEl.className = "bot-icon-img";
      imgEl.src = "static/images/chatboat.png"
      botIcon.appendChild(imgEl);
    }

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = msg.content;
    bubbleDiv.appendChild(contentDiv);

    messageDiv.appendChild(bubbleDiv);

    const firstButtons = chatContainer.querySelector(
      '.role-selection-container, .category-selection-container, .question-selection-container, .back-only-container, .main-heading-container, .therapy-selection-container'
    );
    if (firstButtons) {
      chatContainer.insertBefore(messageDiv, firstButtons);
    } else {
      chatContainer.appendChild(messageDiv);
    }
  });
}

function handleKeyPress(event) {
  if (event.key === 'Enter') sendMessage();
}

function sendMessage() {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;
  addMessage('user', message);
  smoothScrollUserResponseToTop();
  input.value = '';
  input.blur(); // Unfocus
  setTimeout(() => input.focus(), 10);
  processUserInput(message);
}

function refreshVisibleSectionLanguage() {
  if (AppState.currentStage === 'therapy') {
    showTherapyButtons();
  }
  else if (AppState.currentStage === 'main_headings') {
    showMainHeadingButtons(AppState.mainHeadings);
  }
  else if (AppState.currentStage === 'questions') {
    showQuestionButtonsWithGoBack(AppState.currentHeadingQuestions);
  }
}

async function changeLanguage() {
  const select = document.getElementById('language-select');
  const newLang = select.value;
  if (AppState.language === newLang) return;

  AppState.language = newLang;
  updateDisclaimer();
  if (AppState.awaitingInput) {
  let promptKey = null;
  let replacements = {};

  switch (AppState.awaitingInput) {
    case 'name':
      promptKey = 'greeting';
      break;

    case 'mobile':
      promptKey = 'mobile_prompt';
      replacements = { name: AppState.userData.name || '' };
      break;

    case 'specialization':
  promptKey = 'specialization_prompt';

  // Clear old specialization buttons
  const oldSpec = document.querySelector('.specialization-selection-container');
  if (oldSpec) oldSpec.remove();

  break;

case 'custom_specialization':
  promptKey = 'specify_specialization';

  // Clear old specialization buttons
  const oldSpec2 = document.querySelector('.specialization-selection-container');
  if (oldSpec2) oldSpec2.remove();

  break;

  }

  if (promptKey) {
  addMessage('assistant', getText(promptKey, replacements));
  smoothScrollUserResponseToTop();

  // ✅ FIX: re-render specialization container after language change
  if (AppState.awaitingInput === 'specialization') {
    showSpecializationOptions();
  }

  return;
}

}
  addMessage('user', `Language changed to ${newLang}`);
  smoothScrollUserResponseToTop();

  clearChatOptions();

  if (AppState.currentStage === 'therapy') {
    addMessage('assistant', getText('therapy_prompt'));
    await fetchTherapies();
    showTherapyButtons();
  }
  else if (AppState.currentStage === 'main_headings') {
    const therapyTitle =
      AppState.therapies.find(t => t.key === AppState.currentTherapy)?.title || AppState.currentTherapy;
    addMessage('assistant', getText('therapy_selected', { brand: therapyTitle }));
    await fetchMainHeadings(); // re-fetch in selected language
  }
  else if (AppState.currentStage === 'questions') {
    const currentHeadingTitle =
      AppState.mainHeadings.find(h => h.key === AppState.currentMainHeading)?.title || '';
    addMessage('assistant', getText('questions_about', { category: currentHeadingTitle }));
    await selectMainHeading(AppState.currentMainHeading, currentHeadingTitle); // re-fetch questions in new language
  }
  else {
    addMessage('assistant', getText('thank_you', { name: AppState.userData.name || '' }));
    autoScrollImmediate();
  }

  updateInputPanelVisibility();
  // autoScrollImmediate();
}


async function saveUserData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...AppState.userData,
        role: AppState.userRole,
        session_id: AppState.sessionId,
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    console.log('User data saved successfully');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// Typing indicator
function showTypingAnimation() {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv && typingDiv.style.display !== 'block') {
    typingDiv.style.display = 'block';
    // autoScrollImmediate();
  }
}

function hideTypingAnimation() {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) {
    // Instantly hide to prevent ghost dots
    typingDiv.style.display = 'none';
  }
}


// Voice input
let recognition;
function startVoiceInput() {
  if (!BrowserSupport.speechRecognition) {
    alert('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
    return;
  }
  const modal = document.getElementById('voice-modal');
  if (modal) modal.style.display = 'flex';

  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
  } catch (error) {
    console.error('Speech recognition not available:', error);
    addMessage('assistant', 'Voice input is not supported on this device. Please type your message.');
    return;
  }

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  const languageMapping = { Hindi: 'hi-IN', Telugu: 'te-IN', English: 'en-US' };
  recognition.lang = languageMapping[AppState.language] || 'en-US';

  recognition.onresult = function (event) {
    let transcript = event.results[0][0].transcript;
    addMessage('user', transcript);
    smoothScrollUserResponseToTop();
    processUserInput(transcript);
    stopVoiceInput();
  };
  recognition.onerror = function () {
    addMessage('assistant', getText('speech_error'));
    stopVoiceInput();
  };

  recognition.start();
  setTimeout(() => {
    try { recognition.stop(); } catch { }
    stopVoiceInput();
  }, 8000);
}
function stopVoiceInput() {
  const modal = document.getElementById('voice-modal');
  if (modal) modal.style.display = 'none';
}

function clearChatOptions() {
  ['.role-selection-container', '.category-selection-container', '.question-selection-container', '.back-only-container', '.main-heading-container', '.therapy-selection-container'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.remove();
  });
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

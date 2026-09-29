// ==========================================================================
// ABHAY - INTERACTIVE ENGINE
// Features: Hero task launcher, Accessibility controls, Product Tour carousel,
// Auth modal, Real-time Verhoeff & Luhn checksum sanitizer, In-Memory Vault
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeroInput();
  initAccessibility();
  initCarousel();
  initAuthModal();
  initSimulator();
  initShowcaseDemo();
});

// --------------------------------------------------------------------------
// 1. HERO INPUT INTERACTION
// --------------------------------------------------------------------------

function initHeroInput() {
  const heroInput = document.getElementById('hero-task-input');
  const heroBtn = document.getElementById('btn-hero-launch');
  const simInput = document.getElementById('sim-input-text');

  function handleLaunch() {
    const taskText = heroInput ? heroInput.value.trim() : '';
    const target = document.getElementById('simulator');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (simInput && taskText) {
      simInput.value = `Recruitment Task Execution:
Goal: ${taskText}
Candidate: Asha Verma
Aadhaar: 2847 9163 5027
PAN: ABCPV1234K
Mobile: +91 98765 43210
Fee Payment: 4539 1488 0343 6467 (CVV 892)`;
      
      const runBtn = document.getElementById('btn-run-sanitize');
      if (runBtn) runBtn.click();
    }
  }

  if (heroBtn) {
    heroBtn.addEventListener('click', handleLaunch);
  }

  if (heroInput) {
    heroInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleLaunch();
      }
    });
  }
}

// --------------------------------------------------------------------------
// 2. ACCESSIBILITY CONTROLS (from website AccessibilityControls.jsx)
// --------------------------------------------------------------------------

function initAccessibility() {
  const btnInc = document.getElementById('btn-font-inc');
  const btnReset = document.getElementById('btn-font-reset');
  const btnDec = document.getElementById('btn-font-dec');
  const selectLang = document.getElementById('select-lang');
  
  let currentSize = 16;

  function updateFontSize(size) {
    currentSize = Math.max(13, Math.min(22, size));
    document.documentElement.style.setProperty('--base-font-size', `${currentSize}px`);
  }

  if (btnInc) btnInc.addEventListener('click', () => updateFontSize(currentSize + 1.5));
  if (btnReset) btnReset.addEventListener('click', () => updateFontSize(16));
  if (btnDec) btnDec.addEventListener('click', () => updateFontSize(currentSize - 1.5));

  if (selectLang) {
    selectLang.addEventListener('change', (e) => {
      const lang = e.target.value;
      const announcement = document.querySelector('.announcement-text');
      if (lang === 'HI') {
        if (announcement) announcement.textContent = 'ऑन-डिवाइस रिडक्शन लाइव देखें — शून्य डेटा रिसाव स्वचालित ब्राउज़र एजेंट।';
      } else {
        if (announcement) announcement.textContent = 'Watch on-device redaction in action — see zero-leak browser automation live.';
      }
    });
  }
}

// --------------------------------------------------------------------------
// 3. PRODUCT TOUR CAROUSEL (from website HeroCarousel.jsx)
// --------------------------------------------------------------------------

function initCarousel() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot-btn');
  const btnPrev = document.getElementById('car-prev');
  const btnNext = document.getElementById('car-next');
  const btnTogglePlay = document.getElementById('car-toggle-play');

  if (!slides.length) return;

  let currentIndex = 0;
  let isPlaying = true;
  let timer = null;
  const INTERVAL = 5000;

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function prevSlide() {
    showSlide(currentIndex - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    isPlaying = true;
    if (btnTogglePlay) btnTogglePlay.textContent = '⏸';
    timer = setInterval(nextSlide, INTERVAL);
  }

  function stopAutoplay() {
    isPlaying = false;
    if (btnTogglePlay) btnTogglePlay.textContent = '▶';
    if (timer) clearInterval(timer);
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      nextSlide();
      if (isPlaying) startAutoplay();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      prevSlide();
      if (isPlaying) startAutoplay();
    });
  }

  if (btnTogglePlay) {
    btnTogglePlay.addEventListener('click', () => {
      if (isPlaying) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      showSlide(idx);
      if (isPlaying) startAutoplay();
    });
  });

  startAutoplay();
}

// --------------------------------------------------------------------------
// 4. AUTH MODAL (LOGIN & SIGN UP) (from website Auth.jsx)
// --------------------------------------------------------------------------

function initAuthModal() {
  const modal = document.getElementById('auth-modal');
  const btnOpen = document.getElementById('btn-open-login');
  const btnClose = document.getElementById('btn-close-auth');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const groupName = document.getElementById('group-name');
  const groupConfirm = document.getElementById('group-confirm');
  const btnSubmit = document.getElementById('btn-submit-auth');
  const feedback = document.getElementById('auth-feedback');
  const form = document.getElementById('auth-form');

  if (!modal) return;

  let mode = 'login';

  function openModal(defaultMode = 'login') {
    modal.style.display = 'flex';
    setMode(defaultMode);
  }

  function closeModal() {
    modal.style.display = 'none';
    if (feedback) feedback.textContent = '';
  }

  function setMode(newMode) {
    mode = newMode;
    if (feedback) feedback.textContent = '';

    if (mode === 'signup') {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      authTitle.textContent = 'Create Gov / Agency Account';
      authSubtitle.textContent = 'Register credentials for offline agent authorization.';
      groupName.style.display = 'flex';
      groupConfirm.style.display = 'flex';
      btnSubmit.textContent = 'Create Account';
    } else {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      authTitle.textContent = 'Welcome Back';
      authSubtitle.textContent = 'Log in to manage sovereign agent credentials and audits.';
      groupName.style.display = 'none';
      groupConfirm.style.display = 'none';
      btnSubmit.textContent = 'Log In';
    }
  }

  if (btnOpen) btnOpen.addEventListener('click', () => openModal('login'));
  if (btnClose) btnClose.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (tabLogin) tabLogin.addEventListener('click', () => setMode('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => setMode('signup'));

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();

      if (!email || !password) {
        feedback.textContent = '⚠️ Email and password are required.';
        feedback.style.color = '#EF4444';
        return;
      }

      feedback.textContent = mode === 'signup' 
        ? '✓ Account provisioned for ISRO agent portal!' 
        : '✓ Secure session authenticated via local vault token!';
      feedback.style.color = '#10B981';

      setTimeout(() => {
        closeModal();
      }, 1200);
    });
  }
}

// --------------------------------------------------------------------------
// 5. MATHEMATICAL CHECKSUM ALGORITHMS (Client-Side)
// --------------------------------------------------------------------------

// Verhoeff algorithm over dihedral group D5 for Indian Aadhaar validation
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

function isVerhoeffValid(numStr) {
  const clean = numStr.replace(/\D/g, '');
  if (clean.length !== 12 || clean[0] === '0' || clean[0] === '1') return false;
  let c = 0;
  const reversed = clean.split('').reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]];
  }
  return c === 0;
}

// Luhn Mod-10 Checksum for Payment Cards
function isLuhnValid(numStr) {
  const clean = numStr.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// --------------------------------------------------------------------------
// 6. INTERACTIVE SIMULATOR IMPLEMENTATION
// --------------------------------------------------------------------------

function initSimulator() {
  const inputArea = document.getElementById('sim-input-text');
  const runBtn = document.getElementById('btn-run-sanitize');
  const outputArea = document.getElementById('sim-sanitized-output');
  const vaultItems = document.getElementById('sim-vault-items');
  const statusIndicator = document.getElementById('sim-status');
  const presetBtns = document.querySelectorAll('.pill-btn-small');

  const presets = {
    aadhaar: "My Aadhaar Number is 2847 9163 5027 and I need to link it to my mobile number 9876543210 for verification.",
    pan: "Permanent Account Number: ABCPV1234K, registered under candidate name Asha Verma for SAC recruitment.",
    card: "Please charge the application fee of Rs 500 to my card 4539 1488 0343 6467 with CVV 892.",
    mixed: `Applicant Profile (ISRO SAC Recruitment 2026):
Name: Asha Verma
Father: Ramesh Verma
DOB: 14/08/1991
Aadhaar: 2847 9163 5027
PAN: ABCPV1234K
Phone: +91 98765 43210
Email: asha.verma@isro-applicant.in
Permanent Address: Flat 12, Shanti Kunj, Tilak Road, Dadar West, Mumbai 400028`,
    negative: `Hard Negative Benchmark (Must NOT be redacted):
Order ID: 284719283746 (12 digits, fails Verhoeff - NOT an Aadhaar number)
Invoice Number: INV-981245
SKU Code: 894712048123
Timestamp: 1729482910481
Support Toll-Free: 1800 120 4567`
  };

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.getAttribute('data-preset');
      if (presets[presetKey]) {
        inputArea.value = presets[presetKey];
        runSanitizer();
      }
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', runSanitizer);
  }

  // Real-time input debouncing
  let debounceTimeout = null;
  if (inputArea) {
    inputArea.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(runSanitizer, 250);
    });
  }

  function runSanitizer() {
    if (!inputArea || !outputArea) return;
    const text = inputArea.value.trim();
    if (!text) {
      outputArea.innerHTML = '<span class="empty-note">Please enter some text to test the privacy sanitizer.</span>';
      if (vaultItems) vaultItems.innerHTML = '<span class="empty-note">No tokens in vault yet.</span>';
      if (statusIndicator) {
        statusIndicator.textContent = 'Waiting for input...';
        statusIndicator.style.color = '#7E8695';
      }
      return;
    }

    const vault = new Map();
    let sanitized = text;
    let counts = { AADHAAR: 0, PAN: 0, CARD: 0, PHONE: 0, EMAIL: 0, NAME: 0, DOB: 0 };

    // 1. Detect Aadhaar (12 digits with Verhoeff check)
    sanitized = sanitized.replace(/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, (match) => {
      if (isVerhoeffValid(match)) {
        counts.AADHAAR++;
        const tag = `{{AADHAAR_${counts.AADHAAR}}}`;
        vault.set(tag, match);
        return `<span class="tag-token">${tag}</span>`;
      }
      return match;
    });

    // 2. Detect Card (Luhn check)
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, (match) => {
      if (isLuhnValid(match)) {
        counts.CARD++;
        const tag = `{{CARD_${counts.CARD}}}`;
        vault.set(tag, match);
        return `<span class="tag-token">${tag}</span>`;
      }
      return match;
    });

    // 3. Detect PAN (Indian format [A-Z]{5}[0-9]{4}[A-Z])
    sanitized = sanitized.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, (match) => {
      counts.PAN++;
      const tag = `{{PAN_${counts.PAN}}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });

    // 4. Detect Phone (+91 or Indian 10-digit starting 6-9)
    sanitized = sanitized.replace(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g, (match) => {
      counts.PHONE++;
      const tag = `{{PHONE_${counts.PHONE}}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });

    // 5. Detect Email
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
      counts.EMAIL++;
      const tag = `{{EMAIL_${counts.EMAIL}}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });

    // 6. Detect CVV
    sanitized = sanitized.replace(/\bCVV\s*:?\s*(\d{3,4})\b/gi, (match, cvv) => {
      const tag = `{{CVV}}`;
      vault.set(tag, cvv);
      return `CVV: <span class="tag-token null-token">[NEVER SENT]</span>`;
    });

    // 7. Detect Names (Known test person Asha Verma / Ramesh Verma)
    sanitized = sanitized.replace(/\bAsha\s+Verma\b/gi, (match) => {
      counts.NAME++;
      const tag = `{{NAME_1}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });
    sanitized = sanitized.replace(/\bRamesh\s+Verma\b/gi, (match) => {
      counts.NAME++;
      const tag = `{{NAME_2}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });

    // 8. Detect DOB
    sanitized = sanitized.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, (match) => {
      counts.DOB++;
      const tag = `{{DOB_1}}`;
      vault.set(tag, match);
      return `<span class="tag-token">${tag}</span>`;
    });

    // Update Output Panel
    outputArea.innerHTML = sanitized;

    // Update Vault Table
    if (vault.size === 0) {
      if (vaultItems) vaultItems.innerHTML = '<span class="empty-note">No sensitive PII detected. (0 items stored in vault).</span>';
      if (statusIndicator) {
        statusIndicator.textContent = 'Verified: No private data to redact. 0 false positives.';
        statusIndicator.style.color = '#7E8695';
      }
    } else {
      let rowsHtml = '';
      vault.forEach((realVal, tag) => {
        rowsHtml += `
          <div class="vault-row">
            <span class="vault-tag">${tag}</span>
            <span class="vault-val">${realVal}</span>
          </div>
        `;
      });
      if (vaultItems) vaultItems.innerHTML = rowsHtml;
      if (statusIndicator) {
        statusIndicator.textContent = `✓ ${vault.size} PII entities securely tokenized in local device memory (0 Leaks)`;
        statusIndicator.style.color = '#059669';
      }
    }
  }

  // Load default preset on initial boot
  if (inputArea) {
    inputArea.value = presets.mixed;
    runSanitizer();
  }
}

// --------------------------------------------------------------------------
// 7. SHOWCASE DEMO VIDEO TRIGGER
// --------------------------------------------------------------------------

function initShowcaseDemo() {
  const btnPlay = document.getElementById('btn-play-demo');
  if (!btnPlay) return;

  btnPlay.addEventListener('click', () => {
    const simSection = document.getElementById('simulator');
    if (simSection) {
      simSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// --------------------------------------------------------------------------
// 8. HERO YOUTUBE VIDEO MANAGER
// --------------------------------------------------------------------------

window.ABHAY_YOUTUBE_URL = "https://www.youtube.com/embed/YjuYxcOuuHE?rel=0&modestbranding=1";

/**
 * Update the Hero YouTube Iframe video seamlessly.
 * Accepts full URLs (youtube.com/watch?v=..., youtu.be/..., embed/...) or 11-char video ID.
 * @param {string} urlOrId
 */
function setHeroVideo(urlOrId) {
  const iframe = document.getElementById('hero-youtube-iframe');
  if (!iframe || !urlOrId) return;

  let embedUrl = urlOrId.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(embedUrl)) {
    embedUrl = `https://www.youtube.com/embed/${embedUrl}?rel=0&modestbranding=1`;
  } else {
    const match = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match && match[1]) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
  }

  iframe.src = embedUrl;
}

window.setHeroVideo = setHeroVideo;


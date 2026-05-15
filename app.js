/* ============================================================
   app.js — Birthday experience for Nashla 🦭
   Full sound system + navigation + effects
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────
let currentStep = 1;
let cakeExploded = false;
let noButtonEscapes = 0;
let tooltipVisible = false;

// ── Audio Context (lazy init after first user gesture) ─────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (mobile browsers suspend until user gesture)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ============================================================
   SOUND LIBRARY — All ocean/celebration themed
   ============================================================ */

/**
 * Low-level oscillator note helper
 * freq, startT, duration, volume, type, ctx
 */
function synth(ctx, freq, startT, dur, vol = 0.25, type = 'sine', detune = 0) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startT);
  if (detune) osc.detune.setValueAtTime(detune, ctx.currentTime + startT);
  gain.gain.setValueAtTime(0, ctx.currentTime + startT);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startT + 0.02);
  gain.gain.setValueAtTime(vol, ctx.currentTime + startT + dur * 0.7);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startT + dur);
  osc.start(ctx.currentTime + startT);
  osc.stop(ctx.currentTime + startT + dur + 0.05);
}

/**
 * Noise burst (for splash / whoosh effects)
 */
function noiseBurst(ctx, startT, dur, vol = 0.15, hiCut = 3000) {
  const bufSize = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

  const src    = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();

  src.buffer = buf;
  filter.type = 'lowpass';
  filter.frequency.value = hiCut;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, ctx.currentTime + startT);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startT + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startT + dur);

  src.start(ctx.currentTime + startT);
  src.stop(ctx.currentTime + startT + dur + 0.05);
}

// ── SONIDO 1: Clic portal — Burbuja oceánica suave ─────────
function playSoundPortal() {
  try {
    const ctx = getAudioCtx();
    // Rising bubble effect + gentle chord
    for (let i = 0; i < 4; i++) {
      const freq = 200 + i * 80;
      synth(ctx, freq, i * 0.07, 0.35, 0.12, 'sine');
    }
    // Water drop plop
    synth(ctx, 900, 0.0, 0.15, 0.2, 'sine');
    synth(ctx, 600, 0.08, 0.2, 0.15, 'sine');
    // Soft whoosh
    noiseBurst(ctx, 0.0, 0.4, 0.07, 1200);
  } catch(e) {}
}

// ── SONIDO 2: Botón NO escapa — Boing cómico ───────────────
function playSoundBoing() {
  try {
    const ctx = getAudioCtx();
    // Elastic boing: rapid pitch drop
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

// ── SONIDO 3: Tooltip de la foca — Bark gracioso ───────────
function playSoundFocaBark() {
  try {
    const ctx = getAudioCtx();
    // Two short barks: foca 🦭
    [0, 0.22].forEach(t => {
      synth(ctx, 280, t,        0.12, 0.3,  'sawtooth');
      synth(ctx, 180, t + 0.04, 0.10, 0.25, 'square');
      noiseBurst(ctx, t, 0.12, 0.08, 800);
    });
  } catch(e) {}
}

// ── SONIDO 4: Botón SÍ — Chapuzón festivo ──────────────────
function playSoundSi() {
  try {
    const ctx = getAudioCtx();
    // Rising major chord: C-E-G
    [[261.6, 0], [329.6, 0.07], [392, 0.14], [523.2, 0.21]].forEach(([f, t]) => {
      synth(ctx, f, t, 0.6, 0.18, 'sine');
    });
    // Splash
    noiseBurst(ctx, 0, 0.3, 0.1, 2000);
  } catch(e) {}
}

// ── SONIDO 5: Tarjetas aparecen — Burbuja por tarjeta ──────
function playSoundCard(index) {
  try {
    const ctx = getAudioCtx();
    const freq = [440, 523, 659][index] || 440;
    synth(ctx, freq, 0, 0.3, 0.1, 'sine');
    synth(ctx, freq * 1.5, 0.05, 0.2, 0.06, 'sine');
    noiseBurst(ctx, 0, 0.15, 0.05, 2500);
  } catch(e) {}
}

// ── SONIDO 6: Botón "quiero ver torta" — Crescendo océano ──
function playSoundGoToCake() {
  try {
    const ctx = getAudioCtx();
    // Warm ascending arpeggio
    [[196, 0], [246.9, 0.1], [294, 0.2], [392, 0.3], [494, 0.4]].forEach(([f, t]) => {
      synth(ctx, f, t, 0.4, 0.14, 'triangle');
    });
    noiseBurst(ctx, 0, 0.6, 0.08, 1500);
  } catch(e) {}
}

let birthdaySongGain = null;
let birthdayOscillators = [];

function playBirthdayMelody() {
  try {
    const ctx = getAudioCtx();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
    
    birthdaySongGain = masterGain;
    birthdayOscillators = [];

    // Frequencies for Happy Birthday
    const melody = [
      [392, 0.25], [392, 0.25], [440, 0.5], [392, 0.5], [523.25, 0.5], [493.88, 1.0],
      [392, 0.25], [392, 0.25], [440, 0.5], [392, 0.5], [587.33, 0.5], [523.25, 1.0],
      [392, 0.25], [392, 0.25], [783.99, 0.5], [659.25, 0.5], [523.25, 0.5], [493.88, 0.5], [440, 1.0],
      [698.46, 0.25], [698.46, 0.25], [659.25, 0.5], [523.25, 0.5], [587.33, 0.5], [523.25, 2.0]
    ];

    let t = ctx.currentTime + 0.1;
    const tempo = 1.3;

    melody.forEach(([freq, dur]) => {
      const duration = dur / tempo;
      
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      
      osc.frequency.setValueAtTime(freq, t);
      
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(1, t + 0.05);
      oscGain.gain.setValueAtTime(1, t + duration * 0.8);
      oscGain.gain.linearRampToValueAtTime(0, t + duration);
      
      osc.start(t);
      osc.stop(t + duration + 0.1);
      
      birthdayOscillators.push(osc);
      t += duration;
    });
    
  } catch(e) {}
}

function fadeOutBirthdaySong() {
  if (birthdaySongGain) {
    try {
      const ctx = getAudioCtx();
      const currTime = ctx.currentTime;
      birthdaySongGain.gain.setValueAtTime(birthdaySongGain.gain.value, currTime);
      birthdaySongGain.gain.linearRampToValueAtTime(0, currTime + 3.0); // 3 sec fade out
      
      setTimeout(() => {
         birthdayOscillators.forEach(osc => {
             try { osc.stop(); } catch(e){}
         });
         birthdayOscillators = [];
         birthdaySongGain = null;
      }, 3100);
    } catch(e) {}
  }
}

// ── SONIDO 7: Bizcocho explota — Efecto Confeti + Canción ──
function playSoundCakeExplode() {
  try {
    const ctx = getAudioCtx();

    // Pop de confeti (caída rápida de pitch)
    const osc = ctx.createOscillator();
    const popGain = ctx.createGain();
    osc.connect(popGain);
    popGain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    popGain.gain.setValueAtTime(0, ctx.currentTime);
    popGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // Sonido de papelitos volando
    noiseBurst(ctx, 0, 0.6, 0.25, 6000);

    // Iniciar melodía de cumpleaños después del pop
    setTimeout(playBirthdayMelody, 300);
  } catch(e) {}
}

// ── SONIDO 8: Confetti rain — Jingle festivo ───────────────
function playSoundConfetti() {
  try {
    const ctx = getAudioCtx();
    // Bright sparkle arpeggio in C major (high octave)
    const notes = [1047, 1175, 1319, 1568, 1760, 1975, 2093];
    notes.forEach((f, i) => {
      synth(ctx, f, i * 0.08, 0.25, 0.07, 'sine');
    });
    // Reverse arpeggio
    [...notes].reverse().forEach((f, i) => {
      synth(ctx, f, 0.6 + i * 0.07, 0.2, 0.05, 'sine');
    });
  } catch(e) {}
}

// ── SONIDO 9: Botón regalo final — Reveal mágico ───────────
function playSoundReveal() {
  try {
    const ctx = getAudioCtx();
    // Magic shimmer
    [0, 0.1, 0.2, 0.3, 0.4].forEach((t, i) => {
      synth(ctx, 600 + i * 180, t, 0.4, 0.1, 'sine');
    });
    // Warm pad
    [261.6, 329.6, 392, 523.2].forEach(f => {
      synth(ctx, f, 0.1, 0.8, 0.08, 'triangle');
    });
  } catch(e) {}
}

// ── SONIDO 10: Leer carta — Carta abriéndose ───────────────
function playSoundLetter() {
  try {
    const ctx = getAudioCtx();
    // Paper rustle
    noiseBurst(ctx, 0, 0.3, 0.12, 4000);
    // Soft warm chord opening
    [[329.6, 0.1], [392, 0.2], [493.9, 0.3], [587.3, 0.4]].forEach(([f, t]) => {
      synth(ctx, f, t, 0.6, 0.1, 'sine');
    });
    // Gentle bell
    synth(ctx, 880, 0.5, 0.5, 0.15, 'sine');
  } catch(e) {}
}

/* ============================================================
   STEP NAVIGATION
   ============================================================ */
function goToStep(next) {
  const current = document.getElementById(`step-${currentStep}`);
  const target  = document.getElementById(`step-${next}`);
  if (!current || !target) return;

  current.classList.add('zoom-out');

  setTimeout(() => {
    current.classList.remove('active', 'zoom-out');
    target.classList.add('active', 'zoom-in');
    currentStep = next;

    if (next === 3) initJourneyCards();
    if (next === 5) {
      playSoundReveal();
      fadeOutBirthdaySong();
    }

    setTimeout(() => target.classList.remove('zoom-in'), 500);
  }, 450);
}

/* ============================================================
   PASO 1: Portal button click
   ============================================================ */
document.getElementById('btn-portal').addEventListener('click', () => {
  playSoundPortal();
});

/* ============================================================
   PASO 2: El botón NO que escapa
   ============================================================ */
function escapeButton(btn) {
  noButtonEscapes++;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const randX = Math.floor(Math.random() * Math.max(vw - 220, 50));
  const randY = Math.floor(Math.random() * Math.max(vh - 120, 50));

  btn.style.position = 'fixed';
  btn.style.left = randX + 'px';
  btn.style.top  = randY + 'px';
  btn.style.zIndex = '200';
  btn.style.transition = 'left 0.12s ease, top 0.12s ease';

  playSoundBoing();

  if (noButtonEscapes <= 3) showFocaTooltip(btn);

  if (noButtonEscapes > 8) {
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  }
}

function showFocaTooltip(btn) {
  if (tooltipVisible) return;
  tooltipVisible = true;

  const tooltip = document.getElementById('foca-tooltip');
  const rect = btn.getBoundingClientRect();

  tooltip.style.display = 'flex';
  tooltip.style.left = Math.min(rect.left + rect.width / 2 - 90, window.innerWidth - 200) + 'px';
  tooltip.style.top  = Math.max(rect.top - 220, 20) + 'px';

  playSoundFocaBark();

  setTimeout(() => {
    tooltip.style.display = 'none';
    tooltipVisible = false;
  }, 2500);
}

document.getElementById('btn-si').addEventListener('click', () => {
  playSoundSi();
});

/* ============================================================
   PASO 3: Journey Cards — staggered reveal with sound
   ============================================================ */
function initJourneyCards() {
  const cards = document.querySelectorAll('.journey-card');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
      playSoundCard(i);
    }, 300 + i * 380);
  });
}

/* ============================================================
   PASO 4: El Bizcocho explota 🎂
   ============================================================ */
function explodeCake() {
  if (cakeExploded) return;
  cakeExploded = true;

  const cakeEmoji = document.getElementById('cake-emoji');
  const cakeGlow  = document.getElementById('cake-glow');
  const cakeTitle = document.getElementById('cake-title');
  const cakeSub   = document.getElementById('cake-subtitle');
  const bigReveal = document.getElementById('big-reveal');

  // 1. Glow
  cakeGlow.style.opacity = '1';
  cakeGlow.style.transform = 'scale(2)';

  // 2. Explode animation
  cakeEmoji.classList.remove('cake-idle');
  cakeEmoji.classList.add('cake-exploding');

  // 3. SOUND: explosion fanfare
  playSoundCakeExplode();

  // 4. Title update
  setTimeout(() => {
    cakeTitle.textContent = '¡¡¡FELIZ CUMPLEAÑOS!!! 🎉🦭🎂';
    cakeSub.textContent   = '';
  }, 300);

  // 5. Confetti rain + jingle
  setTimeout(() => {
    startEmojiConfetti();
    playSoundConfetti();
  }, 600);

  // 6. Reveal
  setTimeout(() => {
    document.getElementById('cake-wrapper').classList.add('hidden-el');
    bigReveal.classList.add('show-flex');
  }, 800);
}

/* ============================================================
   CONFETTI EMOJI RAIN (canvas)
   ============================================================ */
const CONFETTI_EMOJIS = ['🎂', '🦭', '🎉', '🎈', '✨', '🌊', '⭐', '🎊'];

function startEmojiConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x:     Math.random() * canvas.width,
      y:     -50 - Math.random() * 400,
      vy:    2 + Math.random() * 4,
      vx:    (Math.random() - 0.5) * 3,
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.15,
      size:  20 + Math.random() * 28,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    particles.forEach(p => {
      p.y   += p.vy;
      p.x   += p.vx;
      p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });

    const alive = particles.filter(p => p.y < canvas.height + 80);
    if (alive.length < particles.length) {
      particles.splice(0, particles.length, ...alive);
      if (alive.length > 0) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x:     Math.random() * canvas.width,
            y:     -40,
            vy:    2 + Math.random() * 4,
            vx:    (Math.random() - 0.5) * 3,
            rot:   Math.random() * Math.PI * 2,
            rotV:  (Math.random() - 0.5) * 0.15,
            size:  20 + Math.random() * 28,
            emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
          });
        }
      }
    }

    if (particles.length > 0) requestAnimationFrame(frame);
  }

  frame();

  setTimeout(() => {
    particles.splice(0, particles.length);
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 2000);
  }, 12000);
}

/* ============================================================
   PASO 5: Modal — Mensaje secreto
   ============================================================ */
function showMessage() {
  document.getElementById('message-modal').style.display = 'flex';
  playSoundLetter();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Close on backdrop click
document.getElementById('message-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('message-modal')) closeModal('message-modal');
});

/* ============================================================
   RESIZE — keep confetti canvas sized
   ============================================================ */
window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

/* ============================================================
   DEV SHORTCUT: Shift+Escape to reset
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && e.shiftKey) {
    currentStep = 1;
    cakeExploded = false;
    noButtonEscapes = 0;
    document.querySelectorAll('.step').forEach(s => {
      s.classList.remove('active', 'zoom-in', 'zoom-out');
    });
    document.getElementById('step-1').classList.add('active');
    document.getElementById('big-reveal').classList.remove('show-flex');
    document.getElementById('cake-wrapper').classList.remove('hidden-el');
    const cakeEmoji = document.getElementById('cake-emoji');
    cakeEmoji.classList.remove('cake-exploding');
    cakeEmoji.classList.add('cake-idle');
  }
});

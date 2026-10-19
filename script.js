// --- ELEMENTOS DO DOM ---
const startAudioBtn = document.getElementById('startAudioBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const distortionToggle = document.getElementById('distortionToggle');
const slowModeToggle = document.getElementById('slowModeToggle');
const scoreDisplay = document.getElementById('scoreDisplay');
const detectedNoteEl = document.getElementById('detectedNote');
const detectedFreqEl = document.getElementById('detectedFreq');
const gainSlider = document.getElementById('gainSlider');
const gainValue = document.getElementById('gainValue');
const volumeFill = document.getElementById('volumeFill');
const statusMsg = document.getElementById('statusMsg');
const songSelect = document.getElementById('songSelect');
const stageListBox = document.getElementById('stageListBox');
const currentStageLabel = document.getElementById('currentStageLabel');
const masteryText = document.getElementById('masteryText');
const masteryFill = document.getElementById('masteryFill');
const stageModal = document.getElementById('stageModal');
const nextStageBtn = document.getElementById('nextStageBtn');
const cifrasUrlInput = document.getElementById('cifrasUrlInput');
const fetchUrlBtn = document.getElementById('fetchUrlBtn');
const cifrasInput = document.getElementById('cifrasInput');
const parseCifrasBtn = document.getElementById('parseCifrasBtn');
const canvas = document.getElementById('tabCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const hitEffect = document.getElementById('hitEffect');

// --- ESTADO DO ÁUDIO E JOGO ---
let audioContext = null, analyser = null, distortionNode = null, userGainNode = null;
let isAudioRunning = false, isPlaying = false;
let currentPitch = -1, score = 0;

const stringNames = ["e", "B", "G", "D", "A", "E"];
const stringColors = ["#FF4136", "#FFDC00", "#2ECC40", "#0074D9", "#B10DC9", "#FF851B"];
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const stringBaseFreqs = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41];

const hitLineX = 120;
let scrollSpeed = 2.5;
let currentSongStages = [];
let activeStageIndex = 0;
let activeSongNotes = [];
let totalNotesInStage = 0;
let notesHitInStage = new Set();

// --- MÚSICAS PRÉ-CARREGADAS COM ETAPAS ---
const PRESET_SONGS = {
  comeAsYouAre: {
    title: "Nirvana - Come As You Are",
    stages: [
      { name: "Etapa 1: Corda Solta (E Baixinha)", notes: [{ stringIndex: 5, fret: 0, x: 500 }, { stringIndex: 5, fret: 0, x: 750 }, { stringIndex: 5, fret: 0, x: 1000 }] },
      { name: "Etapa 2: Casas 1 e 2", notes: [{ stringIndex: 5, fret: 1, x: 500 }, { stringIndex: 5, fret: 2, x: 750 }, { stringIndex: 5, fret: 1, x: 1000 }, { stringIndex: 5, fret: 2, x: 1250 }] },
      { name: "Etapa 3: Riff Completo", notes: [
        { stringIndex: 5, fret: 1, x: 500 }, { stringIndex: 5, fret: 1, x: 700 }, { stringIndex: 5, fret: 2, x: 900 },
        { stringIndex: 5, fret: 2, x: 1100 }, { stringIndex: 5, fret: 0, x: 1300 }, { stringIndex: 5, fret: 0, x: 1500 }
      ]}
    ]
  },
  smells: {
    title: "Nirvana - Smells Like Teen Spirit",
    stages: [
      { name: "Etapa 1: Acordes de Poder (Fret 1)", notes: [{ stringIndex: 4, fret: 1, x: 500 }, { stringIndex: 3, fret: 3, x: 500 }, { stringIndex: 4, fret: 1, x: 850 }] },
      { name: "Etapa 2: Sequência Principal", notes: [
        { stringIndex: 4, fret: 1, x: 500 }, { stringIndex: 3, fret: 3, x: 500 },
        { stringIndex: 3, fret: 6, x: 800 }, { stringIndex: 3, fret: 5, x: 1100 }
      ]}
    ]
  },
  smoke: {
    title: "Deep Purple - Smoke on the Water",
    stages: [
      { name: "Etapa 1: Primeira Metade do Riff", notes: [
        { stringIndex: 5, fret: 0, x: 500 }, { stringIndex: 5, fret: 3, x: 700 }, { stringIndex: 5, fret: 5, x: 900 }
      ]},
      { name: "Etapa 2: Riff Completo", notes: [
        { stringIndex: 5, fret: 0, x: 500 }, { stringIndex: 5, fret: 3, x: 700 }, { stringIndex: 5, fret: 5, x: 900 },
        { stringIndex: 5, fret: 0, x: 1200 }, { stringIndex: 5, fret: 3, x: 1400 }, { stringIndex: 5, fret: 6, x: 1600 }, { stringIndex: 5, fret: 5, x: 1800 }
      ]}
    ]
  },
  seven: {
    title: "White Stripes - Seven Nation Army",
    stages: [
      { name: "Etapa 1: Início do Riff", notes: [{ stringIndex: 4, fret: 7, x: 500 }, { stringIndex: 4, fret: 7, x: 750 }, { stringIndex: 4, fret: 10, x: 1000 }] },
      { name: "Etapa 2: Descida Completa", notes: [
        { stringIndex: 4, fret: 7, x: 500 }, { stringIndex: 4, fret: 7, x: 700 }, { stringIndex: 4, fret: 10, x: 900 },
        { stringIndex: 4, fret: 7, x: 1100 }, { stringIndex: 4, fret: 5, x: 1300 }, { stringIndex: 4, fret: 3, x: 1500 }, { stringIndex: 4, fret: 2, x: 1700 }
      ]}
    ]
  }
};

// --- ÁUDIO E CAPTAÇÃO ---
async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const microphone = audioContext.createMediaStreamSource(stream);
    
    distortionNode = audioContext.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(25);
    userGainNode = audioContext.createGain();
    if (gainSlider) userGainNode.gain.value = gainSlider.value / 100;
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.5;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    microphone.connect(distortionNode);
    distortionNode.connect(userGainNode);
    userGainNode.connect(masterGain);
    masterGain.connect(audioContext.destination);
    microphone.connect(analyser);

    isAudioRunning = true;
    if (statusMsg) statusMsg.innerText = "🔊 Joyo Momix Conectada!";
    if (startAudioBtn) {
      startAudioBtn.innerText = "✓ Conectado";
      startAudioBtn.classList.remove('primary-btn');
      startAudioBtn.classList.add('success-btn');
    }
    if (playPauseBtn) playPauseBtn.disabled = false;
    updateAudioProcess();
  } catch (err) {
    if (statusMsg) statusMsg.innerText = "❌ Erro no áudio: " + err.message;
  }
}

function makeDistortionCurve(amount) {
  let k = amount, n = 44100, curve = new Float32Array(n), deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) {
    let x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

if (distortionToggle) {
  distortionToggle.addEventListener('change', (e) => {
    if (distortionNode && audioContext) distortionNode.curve = e.target.checked ? makeDistortionCurve(25) : new Float32Array(0);
  });
}

if (gainSlider) {
  gainSlider.addEventListener('input', (e) => {
    if (gainValue) gainValue.innerText = e.target.value + '%';
    if (userGainNode) userGainNode.gain.value = e.target.value / 100;
  });
}

// --- PITCH DETECTION ---
function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length, rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (volumeFill) volumeFill.style.width = Math.min(100, Math.round(rms * 400)) + '%';
  if (rms < 0.015) return -1;

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;
  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  let T0 = maxpos;
  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
  if (a) T0 -= b / (2 * a);
  return sampleRate / T0;
}

function updateAudioProcess() {
  if (!isAudioRunning) return;
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  let pitch = autoCorrelate(buffer, audioContext.sampleRate);
  
  if (pitch !== -1 && pitch >= 60 && pitch <= 1000) {
    currentPitch = pitch;
    let noteNum = 12 * (Math.log(pitch / 440) / Math.log(2)) + 69;
    let midiNote = Math.round(noteNum);
    let currentNoteName = noteStrings[midiNote % 12];
    if (detectedNoteEl) detectedNoteEl.innerText = currentNoteName;
    if (detectedFreqEl) detectedFreqEl.innerText = pitch.toFixed(1) + " Hz";
  } else {
    currentPitch = -1;
    if (detectedNoteEl) detectedNoteEl.innerText = "--";
    if (detectedFreqEl) detectedFreqEl.innerText = "0.0 Hz";
  }
  requestAnimationFrame(updateAudioProcess);
}

// --- GESTÃO DE ETAPAS E DOMÍNIO ---
function loadSong(songKey) {
  const song = PRESET_SONGS[songKey];
  if (!song) return;
  currentSongStages = song.stages;
  activeStageIndex = 0;
  buildStageUI();
  loadActiveStage();
}

function buildStageUI() {
  if (!stageListBox) return;
  stageListBox.innerHTML = "";
  currentSongStages.forEach((stage, idx) => {
    const item = document.createElement('div');
    item.className = `stage-item ${idx === activeStageIndex ? 'active' : ''}`;
    item.innerHTML = `<span>${stage.name}</span>`;
    item.onclick = () => {
      activeStageIndex = idx;
      loadActiveStage();
      buildStageUI();
    };
    stageListBox.appendChild(item);
  });
}

function loadActiveStage() {
  const stage = currentSongStages[activeStageIndex];
  if (!stage) return;
  if (currentStageLabel) currentStageLabel.innerText = stage.name;
  activeSongNotes = JSON.parse(JSON.stringify(stage.notes));
  totalNotesInStage = activeSongNotes.length;
  notesHitInStage.clear();
  updateMasteryDisplay();
  isPlaying = false;
  if (playPauseBtn) playPauseBtn.innerText = "▶️ Iniciar Etapa";
}

function updateMasteryDisplay() {
  let hitCount = notesHitInStage.size;
  let percent = totalNotesInStage > 0 ? Math.round((hitCount / totalNotesInStage) * 100) : 0;
  if (masteryText) masteryText.innerText = `Domínio: ${percent}%`;
  if (masteryFill) masteryFill.style.width = percent + '%';

  if (percent >= 90 && isPlaying) {
    isPlaying = false;
    if (stageModal) stageModal.classList.remove('hidden');
  }
}

// --- RENDERIZAÇÃO DO JOGO 2D ---
function resizeCanvas() {
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getTargetFreq(stringIndex, fret) {
  return stringBaseFreqs[stringIndex] * Math.pow(2, fret / 12);
}

function drawTab() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const stringSpacing = canvas.height / 7;

  for (let i = 0; i < 6; i++) {
    const y = stringSpacing * (i + 1);
    ctx.strokeStyle = stringColors[i];
    ctx.lineWidth = 2 + (5 - i) * 0.8;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    ctx.fillStyle = stringColors[i]; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(stringNames[i], 20, y + 5);
  }

  ctx.strokeStyle = '#FFDC00'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hitLineX, 0); ctx.lineTo(hitLineX, canvas.height); ctx.stroke();
  if (hitEffect) hitEffect.style.left = (hitLineX - 5) + 'px';

  let speed = (slowModeToggle && slowModeToggle.checked) ? scrollSpeed * 0.7 : scrollSpeed;

  activeSongNotes.forEach((note, index) => {
    if (isPlaying) note.x -= speed;

    const y = stringSpacing * (note.stringIndex + 1);
    if (note.x > -30 && note.x < canvas.width + 30) {
      ctx.beginPath(); ctx.arc(note.x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = note.hit ? '#3fb950' : stringColors[note.stringIndex];
      ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(note.fret.toString(), note.x, y);
    }

    if (isPlaying && !note.hit && Math.abs(note.x - hitLineX) < 18) {
      let targetFreq = getTargetFreq(note.stringIndex, note.fret);
      if (currentPitch !== -1 && Math.abs(currentPitch - targetFreq) < targetFreq * 0.06) {
        note.hit = true;
        notesHitInStage.add(index);
        score += 100;
        if (scoreDisplay) scoreDisplay.innerText = score;
        updateMasteryDisplay();
        if (hitEffect) {
          hitEffect.classList.add('active');
          setTimeout(() => hitEffect.classList.remove('active'), 150);
        }
      }
    }

    if (isPlaying && note.x < hitLineX - 100) {
      note.x = canvas.width + 100;
    }
  });

  requestAnimationFrame(drawTab);
}

// --- BUSCA COM PROXY ---
if (fetchUrlBtn) {
  fetchUrlBtn.addEventListener('click', async () => {
    const url = cifrasUrlInput ? cifrasUrlInput.value.trim() : "";
    if (!url) {
      if (statusMsg) statusMsg.innerText = "⚠️ Cole um link primeiro.";
      return;
    }
    if (statusMsg) statusMsg.innerText = "⏳ A baixar cifra...";
    try {
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (data.contents && cifrasInput) {
        cifrasInput.value = data.contents;
        if (parseCifrasBtn) parseCifrasBtn.click();
      }
    } catch (e) {
      if (statusMsg) statusMsg.innerText = "⚠️ Conexão bloqueada pelo navegador. Cole o texto manualmente abaixo.";
    }
  });
}

// --- CONVERSOR AUTOMÁTICO DE TEXTO EM ETAPAS ---
if (parseCifrasBtn) {
  parseCifrasBtn.addEventListener('click', () => {
    const text = cifrasInput ? cifrasInput.value : "";
    const lines = text.split('\n');
    let extractedNotes = [];
    let currentX = 500;

    lines.forEach(line => {
      let stringIndex = -1;
      let cleanLine = line.trim();
      if (cleanLine.startsWith('e|') || cleanLine.startsWith('E|')) stringIndex = 0;
      else if (cleanLine.startsWith('B|') || cleanLine.startsWith('b|')) stringIndex = 1;
      else if (cleanLine.startsWith('G|') || cleanLine.startsWith('g|')) stringIndex = 2;
      else if (cleanLine.startsWith('D|') || cleanLine.startsWith('d|')) stringIndex = 3;
      else if (cleanLine.startsWith('A|') || cleanLine.startsWith('a|')) stringIndex = 4;
      else if (cleanLine.startsWith('E|')) stringIndex = 5;

      if (stringIndex !== -1) {
        let tabData = cleanLine.substring(2);
        for (let i = 0; i < tabData.length; i++) {
          let char = tabData[i];
          if (!isNaN(parseInt(char))) {
            let fret = parseInt(char);
            if (i + 1 < tabData.length && !isNaN(parseInt(tabData[i + 1]))) { fret = parseInt(char + tabData[i + 1]); i++; }
            extractedNotes.push({ stringIndex, fret, x: currentX + (i * 25) });
          }
        }
      }
    });

    if (extractedNotes.length > 0) {
      let chunks = [];
      for (let i = 0; i < extractedNotes.length; i += 5) {
        chunks.push({ name: `Etapa ${chunks.length + 1} (Custom)`, notes: extractedNotes.slice(i, i + 5) });
      }
      currentSongStages = chunks;
      activeStageIndex = 0;
      buildStageUI();
      loadActiveStage();
      if (statusMsg) statusMsg.innerText = `✅ Cifra dividida em ${chunks.length} etapas!`;
    } else {
      if (statusMsg) statusMsg.innerText = "❌ Formato inválido. Use linhas de tablatura (ex: e|--0--3--|)";
    }
  });
}

// --- EVENTOS DE INTERFACE ---
if (startAudioBtn) startAudioBtn.addEventListener('click', initAudio);

if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playPauseBtn.innerText = isPlaying ? "⏸️ Pausar" : "▶️ Continuar";
  });
}

if (songSelect) songSelect.addEventListener('change', (e) => loadSong(e.target.value));

if (nextStageBtn) {
  nextStageBtn.addEventListener('click', () => {
    if (stageModal) stageModal.classList.add('hidden');
    if (activeStageIndex < currentSongStages.length - 1) {
      activeStageIndex++;
      buildStageUI();
      loadActiveStage();
      isPlaying = true;
      if (playPauseBtn) playPauseBtn.innerText = "⏸️ Pausar";
    } else {
      if (statusMsg) statusMsg.innerText = "🏆 PARABÉNS! Dominaste a música inteira!";
    }
  });
}

// Inicialização
loadSong('comeAsYouAre');
drawTab();
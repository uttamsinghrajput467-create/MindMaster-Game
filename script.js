
// ==========================================
// MIND MASTER - SMART CLICK TO MERGE
// ==========================================

const SIZE = 5;
const TOTAL_LEVELS = 20;

const $ = id => document.getElementById(id);

const TARGETS = Array.from(
  { length: TOTAL_LEVELS },
  (_, i) => 16 * 2 ** i
);

let cells = [];
let level = 1;
let score = 0;
let selected = null;
let nextNumber = 2;

let best = Number(localStorage.getItem("mmBest") || 0);

let unlocked = Math.max(
  1,
  Math.min(
    TOTAL_LEVELS,
    Number(localStorage.getItem("mmUnlocked") || 1)
  )
);

let completed = [];

try {
  const savedCompleted = JSON.parse(
    localStorage.getItem("mmCompleted") || "[]"
  );

  completed = Array.isArray(savedCompleted)
    ? savedCompleted.filter(
        n => Number.isInteger(n) && n >= 1 && n <= TOTAL_LEVELS
      )
    : [];
} catch (error) {
  completed = [];
}

let soundOn = localStorage.getItem("mmSound") === "on";
let toastTimer;
let audioContext = null;
let levelCompleting = false;

const board = $("board");

// ==========================================
// SAVE PROGRESS
// ==========================================

function saveProgress() {
  localStorage.setItem("mmBest", String(best));
  localStorage.setItem("mmUnlocked", String(unlocked));
  localStorage.setItem("mmCompleted", JSON.stringify(completed));
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

// ==========================================
// SOUND
// ==========================================

function playSound(frequency = 500) {
  if (!soundOn) return;

  try {
    const AudioCtx =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return;

    if (!audioContext) audioContext = new AudioCtx();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.15
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);

  } catch (error) {
    console.log("Sound unavailable");
  }
}

// ==========================================
// LEVEL CELEBRATION
// ==========================================

function levelCelebration() {
  try {
    const AudioCtx =
      window.AudioContext || window.webkitAudioContext;

    if (AudioCtx) {
      if (!audioContext) audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const ctx = audioContext;
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        const start = ctx.currentTime + index * 0.16;

        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          start + 0.35
        );

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(start);
        oscillator.stop(start + 0.36);
      });
    }
  } catch (error) {
    console.log("Celebration sound unavailable");
  }

  const celebration = document.createElement("div");
  celebration.id = "levelCelebration";

  celebration.innerHTML = `
    <div class="celebration-message">🎉 LEVEL COMPLETED! 🎉</div>
    <div class="celebration-balloons">🎈 🎊 🎈 🎉 🎈</div>
  `;

  Object.assign(celebration.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    pointerEvents: "none",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.35)"
  });

  celebration.querySelector(".celebration-message").style.cssText = `
    background: #ffffff;
    color: #7c3aed;
    padding: 18px 24px;
    border-radius: 18px;
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    box-shadow: 0 0 30px rgba(255,255,255,0.5);
    animation: celebrationPop 0.5s ease-out;
  `;

  celebration.querySelector(".celebration-balloons").style.cssText = `
    font-size: 42px;
    margin-top: 22px;
    animation: celebrationFloat 1s ease-in-out infinite alternate;
  `;

  if (!document.getElementById("celebrationAnimationStyles")) {
    const style = document.createElement("style");
    style.id = "celebrationAnimationStyles";

    style.textContent = `
      @keyframes celebrationPop {
        0% { transform: scale(0.3); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes celebrationFloat {
        from { transform: translateY(0) rotate(-5deg); }
        to { transform: translateY(-18px) rotate(5deg); }
      }

      .level-confetti {
        position: absolute;
        top: -20px;
        width: 10px;
        height: 16px;
        animation: confettiFall 2.5s linear forwards;
      }

      @keyframes confettiFall {
        to {
          transform: translateY(110vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.getElementById("levelCelebration")?.remove();
  document.body.appendChild(celebration);

  for (let i = 0; i < 65; i++) {
    const piece = document.createElement("span");

    piece.className = "level-confetti";
    piece.style.left = Math.random() * 100 + "%";

    piece.style.backgroundColor = [
      "#ff4757",
      "#ffa502",
      "#2ed573",
      "#1e90ff",
      "#eccc68",
      "#a55eea"
    ][Math.floor(Math.random() * 6)];

    piece.style.animationDelay = Math.random() * 0.8 + "s";

    piece.style.animationDuration =
      (1.8 + Math.random() * 1.5) + "s";

    celebration.appendChild(piece);
  }

  setTimeout(() => {
    celebration.remove();
  }, 3000);
}

// ==========================================
// SMART MATCHING SYSTEM
// ==========================================

// Check whether a matching pair exists

function hasAvailableMerge() {
  const counts = {};

  cells.forEach(value => {
    if (value > 0) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  return Object.values(counts).some(count => count >= 2);
}

// Generate a safe number for the next block

function getSafeSpawnNumber() {
  const counts = {};

  cells.forEach(value => {
    if (value > 0) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  const availableNumbers = Object.keys(counts).map(Number);

  if (availableNumbers.length === 0) {
    return 2;
  }

  // Prefer numbers which already have matching pairs

  const matchingNumbers = availableNumbers.filter(
    number => counts[number] >= 2
  );

  const pool = matchingNumbers.length > 0
    ? matchingNumbers
    : availableNumbers;

  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// LEVEL SELECTION
// ==========================================

function renderLevels() {
  const grids = document.querySelectorAll("#levelGrid");

  grids.forEach(grid => {
    grid.innerHTML = "";

    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const button = document.createElement("button");

      button.className = "level-card";
      button.textContent = i;

      if (completed.includes(i)) {
        button.classList.add("completed");
      }

      if (i > unlocked) {
        button.classList.add("locked");
        button.disabled = true;
      }

      button.addEventListener("click", () => startLevel(i));

      grid.appendChild(button);
    }
  });

  if ($("homeBest")) {
    $("homeBest").textContent = formatNumber(best);
  }

  if ($("completedCount")) {
    $("completedCount").textContent = completed.length;
  }
}

// ==========================================
// START LEVEL
// ==========================================

function randomBlock() {
  return getSafeSpawnNumber();
}

function startLevel(n) {
  if (n > unlocked || n < 1 || n > TOTAL_LEVELS) return;

  level = n;
  score = 0;
  selected = null;
  levelCompleting = false;

  cells = Array(SIZE * SIZE).fill(0);

  const startingBlocks = [
    [0, 2],
    [1, 2],
    [5, 4],
    [6, 4],
    [12, 2],
    [17, 2],
    [18, 4]
  ];

  startingBlocks.forEach(([index, value]) => {
    cells[index] = value;
  });

  nextNumber = getSafeSpawnNumber();

  if ($("homeScreen")) $("homeScreen").hidden = true;
  if ($("gameScreen")) $("gameScreen").hidden = false;
  if ($("modal")) $("modal").hidden = true;

  if ($("levelTitle")) {
    $("levelTitle").textContent = "Level " + level;
  }

  if ($("targetValue")) {
    $("targetValue").textContent = formatNumber(TARGETS[level - 1]);
  }

  renderBoard();
  updateProgress();
}

// ==========================================
// RENDER BOARD
// ==========================================

function renderBoard() {
  if (!board) return;

  board.innerHTML = "";

  cells.forEach((value, index) => {
    const tile = document.createElement("div");

    tile.className = "cell";
    tile.dataset.index = index;

    if (value === 0) {
      tile.classList.add("empty");
    } else {
      tile.textContent = formatNumber(value);

      if (value <= 512) {
        tile.classList.add("n" + value);
      } else {
        tile.classList.add("big");
      }
    }

    if (selected === index) {
      tile.classList.add("selected");
    }

    tile.addEventListener("click", () => clickTile(index));

    board.appendChild(tile);
  });

  if ($("score")) {
    $("score").textContent = formatNumber(score);
  }

  if ($("best")) {
    $("best").textContent = formatNumber(best);
  }

  if ($("nextTile")) {
    $("nextTile").textContent = formatNumber(nextNumber);
  }
}

// ==========================================
// CLICK TO MERGE
// ==========================================

function clickTile(index) {
  if (levelCompleting) return;

  if (cells[index] === 0) {
    showToast("Select a numbered block!");
    return;
  }

  if (selected === null) {
    selected = index;

    renderBoard();
    playSound(350);

    return;
  }

  if (selected === index) {
    selected = null;
    renderBoard();

    return;
  }

  const firstValue = cells[selected];
  const secondValue = cells[index];

  if (firstValue !== secondValue) {
    selected = index;

    renderBoard();

    showToast("Select another block with the same number!");

    return;
  }

  // MERGE TWO MATCHING BLOCKS

  const mergedValue = firstValue * 2;

  cells[selected] = 0;
  cells[index] = mergedValue;

  score += mergedValue;

  if (score > best) {
    best = score;
    saveProgress();
  }

  selected = null;

  playSound(650);

  renderBoard();
  updateProgress();

  showToast(
    `${formatNumber(firstValue)} + ${formatNumber(firstValue)} = ${formatNumber(mergedValue)}`
  );

  // CHECK LEVEL TARGET

  if (mergedValue >= TARGETS[level - 1]) {
    levelCompleting = true;

    setTimeout(completeLevel, 300);

    return;
  }

  // GENERATE A GUARANTEED MATCHING BLOCK

  spawnBlock();

  renderBoard();
  updateProgress();
}

// ==========================================
// SMART SPAWN BLOCK
// ==========================================

function spawnBlock() {
  const emptyCells = [];

  cells.forEach((value, index) => {
    if (value === 0) {
      emptyCells.push(index);
    }
  });

  if (emptyCells.length === 0) {
    showToast("No empty space available!");
    return false;
  }

  let spawnNumber = nextNumber;

  // If there is no matching pair,
  // choose a number already present on the board.

  if (!hasAvailableMerge()) {
    if (!cells.includes(spawnNumber)) {
      spawnNumber = getSafeSpawnNumber();
    }
  }

  // If the preview is invalid, recover safely.

  if (!Number.isFinite(spawnNumber) || spawnNumber <= 0) {
    spawnNumber = getSafeSpawnNumber();
  }

  // Random position

  const randomIndex = Math.floor(
    Math.random() * emptyCells.length
  );

  cells[emptyCells[randomIndex]] = spawnNumber;

  // Prepare next preview

  nextNumber = getSafeSpawnNumber();

  // SAFETY CHECK:
  // There must always be at least one matching pair.

  if (!hasAvailableMerge()) {
    const recoveryCells = cells
      .map((value, index) => ({ value, index }))
      .filter(item => item.value > 0);

    if (recoveryCells.length >= 1) {
      const recoveryNumber = recoveryCells[0].value;

      const recoveryEmpty = cells.findIndex(value => value === 0);

      if (recoveryEmpty !== -1) {
        cells[recoveryEmpty] = recoveryNumber;
      }
    }
  }

  return true;
}

// ==========================================
// SCORE AND PROGRESS
// ==========================================

function updateProgress() {
  const target = TARGETS[level - 1];

  if ($("progressText")) {
    $("progressText").textContent =
      `${formatNumber(score)} / ${formatNumber(target)}`;
  }

  if ($("progressBar")) {
    $("progressBar").style.width =
      Math.min(100, (score / target) * 100) + "%";
  }

  if ($("score")) {
    $("score").textContent = formatNumber(score);
  }

  if ($("best")) {
    $("best").textContent = formatNumber(best);
  }
}

// ==========================================
// LEVEL COMPLETED
// ==========================================

function completeLevel() {
  if (!levelCompleting) return;

  if (!completed.includes(level)) {
    completed.push(level);
  }

  unlocked = Math.max(
    unlocked,
    Math.min(TOTAL_LEVELS, level + 1)
  );

  saveProgress();

  levelCelebration();
  renderLevels();

  if ($("modal")) $("modal").hidden = false;

  if ($("modalIcon")) $("modalIcon").textContent = "🏆";

  if ($("modalEyebrow")) {
    $("modalEyebrow").textContent = "LEVEL COMPLETED";
  }

  if ($("modalTitle")) {
    $("modalTitle").textContent = "Brilliant!";
  }

  if ($("modalText")) {
    $("modalText").textContent = "You reached the target!";
  }

  if ($("modalScore")) {
    $("modalScore").textContent = formatNumber(score);
  }

  if ($("modalStars")) {
    $("modalStars").textContent = "★ ★ ★";
  }

  if ($("modalPrimary")) {
    $("modalPrimary").textContent =
      level < TOTAL_LEVELS ? "Next Level" : "Play Again";

    $("modalPrimary").onclick = () => {
      $("modal").hidden = true;

      if (level < TOTAL_LEVELS) {
        startLevel(level + 1);
      } else {
        startLevel(1);
      }
    };
  }

  if ($("modalSecondary")) {
    $("modalSecondary").textContent = "Level Selection";
    $("modalSecondary").onclick = backToLevels;
  }
}

// ==========================================
// FULL BOARD CHECK
// ==========================================

function checkFullBoard() {
  if (cells.every(value => value !== 0)) {
    if (!hasAvailableMerge()) {
      showToast("Board full! Restart the level.");
    }
  }
}

// ==========================================
// HOME AND RESTART
// ==========================================

function backToLevels() {
  levelCompleting = false;

  if ($("modal")) $("modal").hidden = true;
  if ($("gameScreen")) $("gameScreen").hidden = true;
  if ($("homeScreen")) $("homeScreen").hidden = false;

  selected = null;

  renderLevels();
}

function restartLevel() {
  startLevel(level);
}

// ==========================================
// BUTTON EVENTS
// ==========================================

if ($("backBtn")) {
  $("backBtn").addEventListener("click", backToLevels);
}

if ($("restartBtn")) {
  $("restartBtn").addEventListener("click", restartLevel);
}

// ==========================================
// THREE-DOT MENU
// ==========================================

const menuBtn = $("menuBtn");
const gameMenu = $("gameMenu");

const soundMenuBtn = $("soundMenuBtn");
const helpMenuBtn = $("helpMenuBtn");
const progressMenuBtn = $("progressMenuBtn");
const resetMenuBtn = $("resetMenuBtn");

function closeGameMenu() {
  if (gameMenu) {
    gameMenu.classList.add("hidden");
  }
}

if (menuBtn && gameMenu) {
  menuBtn.addEventListener("click", event => {
    event.stopPropagation();
    gameMenu.classList.toggle("hidden");
  });

  gameMenu.addEventListener("click", event => {
    event.stopPropagation();
  });

  document.addEventListener("click", closeGameMenu);
}

// ==========================================
// SOUND MENU
// ==========================================

function updateSoundLabel() {
  if (soundMenuBtn) {
    soundMenuBtn.textContent = soundOn
      ? "🔊 Sound: ON"
      : "🔇 Sound: OFF";
  }
}

if (soundMenuBtn) {
  soundMenuBtn.addEventListener("click", () => {
    soundOn = !soundOn;

    localStorage.setItem("mmSound", soundOn ? "on" : "off");

    updateSoundLabel();
    closeGameMenu();

    if (soundOn) playSound(700);

    showToast(soundOn ? "Sound ON" : "Sound OFF");
  });
}

// ==========================================
// HOW TO PLAY
// ==========================================

if (helpMenuBtn) {
  helpMenuBtn.addEventListener("click", () => {
    closeGameMenu();

    alert(
      "HOW TO PLAY - MIND MASTER\n\n" +
      "1. Kisi numbered block par click karo.\n" +
      "2. Usi number wale doosre block par click karo.\n" +
      "3. Dono blocks merge hokar double number banayenge.\n" +
      "4. Alag numbers merge nahi honge.\n" +
      "5. Target tak pahunchkar level complete karo.\n\n" +
      "Tip: Board par blocks ke liye jagah bachakar rakho!"
    );
  });
}

// ==========================================
// MY PROGRESS
// ==========================================

if (progressMenuBtn) {
  progressMenuBtn.addEventListener("click", () => {
    closeGameMenu();

    let savedCompleted = [];

    try {
      savedCompleted = JSON.parse(
        localStorage.getItem("mmCompleted") || "[]"
      );

      if (!Array.isArray(savedCompleted)) {
        savedCompleted = [];
      }
    } catch (error) {
      savedCompleted = [];
    }

    const savedBest = Number(localStorage.getItem("mmBest") || 0);

    const savedUnlocked = Math.min(
      TOTAL_LEVELS,
      Math.max(1, Number(localStorage.getItem("mmUnlocked") || 1))
    );

    alert(
      "🏆 MY PROGRESS\n\n" +
      "Completed levels: " + savedCompleted.length + " / " + TOTAL_LEVELS + "\n" +
      "Unlocked levels: " + savedUnlocked + " / " + TOTAL_LEVELS + "\n" +
      "Best score: " + formatNumber(savedBest)
    );
  });
}

// ==========================================
// RESET PROGRESS
// ==========================================

if (resetMenuBtn) {
  resetMenuBtn.addEventListener("click", () => {
    closeGameMenu();

    const confirmed = confirm(
      "Reset all game progress?\n\n" +
      "Your best score, completed levels and unlocked levels will be reset.\n" +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    localStorage.removeItem("mmBest");
    localStorage.removeItem("mmUnlocked");
    localStorage.removeItem("mmCompleted");

    alert("Game progress reset successfully.");

    location.reload();
  });
}

// ==========================================
// INITIALIZE
// ==========================================

renderLevels();
updateSoundLabel();

console.log("Mind Master Smart Matching System Loaded!");

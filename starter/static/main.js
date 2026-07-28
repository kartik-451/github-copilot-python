// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let timerInterval = null;
let startTime = null;
let timerRunning = false;
const LEADERBOARD_KEY = 'sudoku-leaderboard';
let completedTime = 0;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimer() {
  if (!timerRunning || startTime === null) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('timer').innerText = `Time: ${formatTime(elapsed)}`;
}

function startTimer() {
  clearInterval(timerInterval);
  startTime = Date.now();
  timerRunning = true;
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function resetTimer() {
  stopTimer();
  startTime = null;
  completedTime = 0;
  document.getElementById('timer').innerText = 'Time: 00:00';
}

function getLeaderboard() {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.innerText = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem('sudoku-theme') || 'light';
  applyTheme(savedTheme);
}

function renderLeaderboard() {
  const leaderboardDiv = document.getElementById('leaderboard');
  const entries = getLeaderboard().slice(0, 10);
  if (entries.length === 0) {
    leaderboardDiv.innerHTML = '<h3>Leaderboard</h3><p>No completed games yet.</p>';
    return;
  }

  leaderboardDiv.innerHTML = '<h3>Leaderboard</h3><ol>' + entries.map((entry, index) => {
    const timeLabel = `${Math.floor(entry.time / 60).toString().padStart(2, '0')}:${(entry.time % 60).toString().padStart(2, '0')}`;
    return `<li>#${index + 1} ${entry.playerName} — ${timeLabel} — ${entry.difficulty}</li>`;
  }).join('') + '</ol>';
}

function addLeaderboardEntry() {
  const playerName = window.prompt('Enter your name for the leaderboard:', 'Player') || 'Player';
  const difficulty = document.getElementById('difficulty-select').value;
  const entries = getLeaderboard();
  entries.push({
    playerName: playerName.trim() || 'Player',
    time: completedTime,
    difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  });
  entries.sort((a, b) => a.time - b.time);
  saveLeaderboard(entries.slice(0, 10));
  renderLeaderboard();
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  const difficulty = document.getElementById('difficulty-select').value;
  const res = await fetch(`/new?difficulty=${difficulty}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
  resetTimer();
  startTimer();
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    stopTimer();
    completedTime = Math.floor((Date.now() - startTime) / 1000);
    addLeaderboardEntry();
    msg.className = 'success';
    msg.style.color = '#2e7d32';
    msg.innerText = 'Congratulations! You solved it!';
  } else {
    msg.className = '';
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

async function giveHint() {
  const res = await fetch('/hint');
  const data = await res.json();
  if (data.error) {
    document.getElementById('message').innerText = data.error;
    return;
  }

  const idx = data.row * SIZE + data.col;
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const inp = inputs[idx];
  inp.value = data.value;
  inp.disabled = true;
  inp.className = 'sudoku-cell prefilled';
  document.getElementById('message').innerText = 'Hint used.';
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-puzzle').addEventListener('click', checkSolution);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', giveHint);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('sudoku-theme', nextTheme);
    applyTheme(nextTheme);
  });
  document.getElementById('difficulty-select').addEventListener('change', () => {
    resetTimer();
    newGame();
  });
  loadTheme();
  renderLeaderboard();
  // initialize
  newGame();
});
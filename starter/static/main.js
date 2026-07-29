// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let timerInterval = null;
let startTime = null;
let timerRunning = false;
const LEADERBOARD_KEY = 'sudoku-leaderboard';
let completedTime = 0;
let hintsUsed = 0;

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
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      playerName: entry.playerName || 'Player',
      time: Number(entry.time) || 0,
      difficulty: entry.difficulty || 'Medium',
      hintsUsed: Number(entry.hintsUsed) || 0
    }));
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
    return `<li>#${index + 1} ${entry.playerName} — ${timeLabel} — ${entry.difficulty} — Hints: ${entry.hintsUsed}</li>`;
  }).join('') + '</ol>';
}

function addLeaderboardEntry() {
  const playerName = window.prompt('Enter your name for the leaderboard:', 'Player') || 'Player';
  const difficulty = document.getElementById('difficulty-select').value;
  const entries = getLeaderboard();
  entries.push({
    playerName: playerName.trim() || 'Player',
    time: completedTime,
    difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    hintsUsed: hintsUsed
  });
  entries.sort((a, b) => a.time - b.time);
  saveLeaderboard(entries.slice(0, 10));
  renderLeaderboard();
}

function hasConflict(board, row, col, value) {
  for (let c = 0; c < SIZE; c++) {
    if (c !== col && board[row][c] === value) return true;
  }
  for (let r = 0; r < SIZE; r++) {
    if (r !== row && board[r][col] === value) return true;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === value) return true;
    }
  }
  return false;
}

function updateCellValidation() {
  const boardDiv = document.getElementById('sudoku-board');
  if (!boardDiv) return;

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

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) {
      applyCellClasses(inp, 'prefilled');
      continue;
    }

    const row = parseInt(inp.dataset.row, 10);
    const col = parseInt(inp.dataset.col, 10);
    const value = inp.value;
    if (value && hasConflict(board, row, col, parseInt(value, 10))) {
      applyCellClasses(inp, 'incorrect');
    } else {
      applyCellClasses(inp);
    }
  }
}

function getBoxClass(row, col) {
  return (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0 ? 'box-a' : 'box-b';
}

function applyCellClasses(input, extraClass = '') {
  const row = parseInt(input.dataset.row, 10);
  const col = parseInt(input.dataset.col, 10);
  const classes = ['sudoku-cell', getBoxClass(row, col)];
  if (extraClass) {
    classes.push(extraClass);
  }
  input.className = classes.join(' ');
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
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        updateCellValidation();
      });
      applyCellClasses(input);
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
        applyCellClasses(inp, 'prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
        applyCellClasses(inp);
      }
    }
  }
  updateCellValidation();
}

async function newGame() {
  const difficulty = document.getElementById('difficulty-select').value;
  hintsUsed = 0;
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
    if (inp.disabled) {
      applyCellClasses(inp, 'prefilled');
      continue;
    }
    if (incorrect.has(idx)) {
      applyCellClasses(inp, 'incorrect');
    } else {
      applyCellClasses(inp);
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
  hintsUsed += 1;
  applyCellClasses(inp, 'prefilled');
  updateCellValidation();
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
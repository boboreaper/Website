// Global variables
let mode = 'none';
let menuOpen = false;
let selectedBox = null;
let boxes = [];
let strokes = [];
let drawing = false;
let currentStroke = null;
let brushSize = 3;
let brushColor = '#ffffff';

// Elements
const fab = document.getElementById('fab');
const menu = document.getElementById('menu');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const content = document.getElementById('content');
const settings = document.getElementById('settings');
const fileInput = document.getElementById('file-input');

// Initialize
function init() {
  setupCanvas();
  setupEvents();
  console.log('App initialized');
}

function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redrawCanvas();
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw strokes
  strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  });

  // Draw current stroke
  if (currentStroke && currentStroke.points.length > 1) {
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
    for (let i = 1; i < currentStroke.points.length; i++) {
      ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
    }
    ctx.stroke();
  }
}

function setupEvents() {
  // FAB button
  fab.addEventListener('click', () => {
    toggleMenu();
  });

  // Menu buttons
  document.getElementById('btn-draw').addEventListener('click', () => setMode('draw'));
  document.getElementById('btn-text').addEventListener('click', () => setMode('text'));
  document.getElementById('btn-link').addEventListener('click', () => setMode('link'));
  document.getElementById('btn-image').addEventListener('click', () => {
    fileInput.click();
    closeMenu();
  });
  document.getElementById('btn-erase').addEventListener('click', () => setMode('erase'));
  document.getElementById('btn-save').addEventListener('click', () => {
    saveToGitHub();
    closeMenu();
  });

  // Canvas drawing
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Canvas clicks for text/link
  canvas.addEventListener('click', handleCanvasClick);

  // File input
  fileInput.addEventListener('change', handleFileInput);

  // Window resize
  window.addEventListener('resize', setupCanvas);

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fab') && !e.target.closest('.menu')) {
      closeMenu();
    }
  });
}

function toggleMenu() {
  menuOpen = !menuOpen;
  fab.classList.toggle('open', menuOpen);
  menu.classList.toggle('open', menuOpen);
  fab.textContent = menuOpen ? '×' : '+';
  console.log('Menu toggled:', menuOpen);
}

function closeMenu() {
  menuOpen = false;
  fab.classList.remove('open');
  menu.classList.remove('open');
  fab.textContent = '+';
}

function setMode(newMode) {
  mode = newMode;
  closeMenu();
  showSettings(mode);
  console.log('Mode set to:', mode);
}

function showSettings(currentMode) {
  const title = document.getElementById('settings-title');
  const content = document.getElementById('settings-content');

  let html = '';

  if (currentMode === 'draw') {
    title.textContent = '🎨 Drawing';
    html = `
      <div class="setting">
        <label>Color:</label>
        <input type="color" value="${brushColor}" onchange="brushColor = this.value">
      </div>
      <div class="setting">
        <label>Size: ${brushSize}px</label>
        <input type="range" min="1" max="50" value="${brushSize}" 
               oninput="brushSize = parseInt(this.value); this.previousElementSibling.textContent = 'Size: ' + this.value + 'px'">
      </div>
      <button onclick="clearCanvas()" style="background: #dc2626; border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-top: 10px;">
        Clear All
      </button>
    `;
  } else if (currentMode === 'text') {
    title.textContent = '📝 Text Mode';
    html = `<p style="opacity: 0.8; font-size: 14px;">Click anywhere on the canvas to add a text box.</p>`;
  } else if (currentMode === 'link') {
    title.textContent = '🔗 Link Mode';
    html = `<p style="opacity: 0.8; font-size: 14px;">Click anywhere to add a link. You'll be prompted for the URL.</p>`;
  } else if (currentMode === 'erase') {
    title.textContent = '🧽 Eraser';
    html = `<p style="opacity: 0.8; font-size: 14px;">Click and drag on drawings to erase them.</p>`;
  }

  content.innerHTML = html;
  settings.classList.add('show');
}

function closeSettings() {
  settings.classList.remove('show');
  mode = 'none';
}

function handleMouseDown(e) {
  const pos = getMousePos(e);

  if (mode === 'draw') {
    drawing = true;
    currentStroke = {
      points: [pos],
      color: brushColor,
      size: brushSize
    };
  } else if (mode === 'erase') {
    eraseAt(pos);
  }
}

function handleMouseMove(e) {
  if (!drawing || mode !== 'draw') return;

  const pos = getMousePos(e);
  currentStroke.points.push(pos);
  redrawCanvas();
}

function handleMouseUp() {
  if (drawing && currentStroke) {
    strokes.push(currentStroke);
    currentStroke = null;
    drawing = false;
    redrawCanvas();
  }
}

function handleCanvasClick(e) {
  if (drawing) return;

  const pos = getMousePos(e);

  if (mode === 'text') {
    addTextBox(pos);
  } else if (mode === 'link') {
    addLinkBox(pos);
  }
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function addTextBox(pos) {
  const id = 'text-' + Date.now();
  const box = {
    id,
    type: 'text',
    x: Math.round(pos.x / 32) * 32,
    y: Math.round(pos.y / 32) * 32,
    width: 200,
    height: 80,
    text: '',
    color: '#ffffff',
    fontSize: 16
  };

  boxes.push(box);
  renderTextBox(box);
  closeSettings();
  console.log('Added text box:', box);
}

function renderTextBox(box) {
  const div = document.createElement('div');
  div.className = 'text-box';
  div.id = box.id;
  div.style.left = box.x + 'px';
  div.style.top = box.y + 'px';
  div.style.width = box.width + 'px';
  div.style.height = box.height + 'px';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Type here...';
  textarea.value = box.text;
  textarea.style.color = box.color;
  textarea.style.fontSize = box.fontSize + 'px';

  textarea.addEventListener('input', (e) => {
    box.text = e.target.value;
  });

  div.appendChild(textarea);
  content.appendChild(div);

  // Make draggable
  makeDraggable(div, box);

  // Focus the textarea
  setTimeout(() => textarea.focus(), 100);
}

function addLinkBox(pos) {
  const url = prompt('Enter URL:');
  if (!url) return;

  const id = 'link-' + Date.now();
  const box = {
    id,
    type: 'link',
    x: Math.round(pos.x / 32) * 32,
    y: Math.round(pos.y / 32) * 32,
    width: 200,
    height: 40,

// script.js — complete working version

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

// Elements (will exist because script is loaded at end of body)
const fab = document.getElementById('fab');
const menu = document.getElementById('menu');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const content = document.getElementById('content');
const settings = document.getElementById('settings');
const fileInput = document.getElementById('file-input');

// Initialize app
function init() {
  setupCanvas();
  setupEvents();
  console.log('App initialized');
  // keep canvas redrawn if window changes devicePixelRatio
  window.addEventListener('resize', setupCanvas);
}

// Set up canvas with devicePixelRatio scaling
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawCanvas();
}

// Redraw strokes + current stroke
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw saved strokes
  strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke.color || '#fff';
    ctx.lineWidth = stroke.size || 3;
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    ctx.stroke();
  });

  // draw current stroke
  if (currentStroke && currentStroke.points && currentStroke.points.length > 0) {
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentStroke.color || '#fff';
    ctx.lineWidth = currentStroke.size || 3;
    ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
    for (let i = 1; i < currentStroke.points.length; i++) ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
    ctx.stroke();
  }
}

// Set up UI & pointer events
function setupEvents() {
  // FAB toggle
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
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

  // Pointer events on canvas (pointer API covers mouse + touch + pen)
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  // click to add text/link (separate from drawing)
  canvas.addEventListener('click', handleCanvasClick);

  // file input
  fileInput.addEventListener('change', handleFileInput);

  // close menu when clicking outside
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
  console.log('Mode:', mode);
}

// show settings panel content
function showSettings(currentMode) {
  const title = document.getElementById('settings-title');
  const settingsContent = document.getElementById('settings-content');
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
  } else {
    title.textContent = 'Settings';
  }

  settingsContent.innerHTML = html;
  settings.classList.add('show');
}

function closeSettings() {
  settings.classList.remove('show');
  mode = 'none';
}

// Pointer handlers
function handlePointerDown(e) {
  // only react for primary button
  if (e.button && e.button !== 0) return;
  const pos = getMousePos(e);

  if (mode === 'draw') {
    drawing = true;
    currentStroke = { points: [pos], color: brushColor, size: brushSize };
  } else if (mode === 'erase') {
    eraseAt(pos);
  }
}

function handlePointerMove(e) {
  const pos = getMousePos(e);
  if (drawing && mode === 'draw' && currentStroke) {
    currentStroke.points.push(pos);
    redrawCanvas();
  } else if (mode === 'erase' && (e.buttons === 1 || e.pressure > 0)) {
    // continuous erase while pointer pressed
    eraseAt(pos);
  }
}

function handlePointerUp(e) {
  if (drawing && currentStroke) {
    strokes.push(currentStroke);
    currentStroke = null;
    drawing = false;
    redrawCanvas();
  }
}

// click handler to add text / link boxes
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
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top)
  };
}

// Text boxes
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
  console.log('Added text box', box);
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

  // Make draggable and focus
  makeDraggable(div, box);
  setTimeout(() => textarea.focus(), 80);
}

// Link boxes
function addLinkBox(pos) {
  const url = prompt('Enter URL (including https://):');
  if (!url) return;
  const id = 'link-' + Date.now();
  const box = {
    id,
    type: 'link',
    x: Math.round(pos.x / 32) * 32,
    y: Math.round(pos.y / 32) * 32,
    width: 200,
    height: 40,
    url,
    text: url
  };
  boxes.push(box);
  renderLinkBox(box);
  closeSettings();
  console.log('Added link box', box);
}

function renderLinkBox(box) {
  const div = document.createElement('div');
  div.className = 'link-box';
  div.id = box.id;
  div.style.left = box.x + 'px';
  div.style.top = box.y + 'px';
  div.style.width = box.width + 'px';
  div.style.height = box.height + 'px';
  div.textContent = '🔗 ' + box.text;

  div.addEventListener('dblclick', () => {
    window.open(box.url, '_blank');
  });

  content.appendChild(div);
  makeDraggable(div, box);
}

// Image upload
function handleFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const id = 'image-' + Date.now();
    const box = {
      id,
      type: 'image',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      src: ev.target.result
    };
    boxes.push(box);
    renderImageBox(box);
    console.log('Added image', box);
  };
  reader.readAsDataURL(file);
  // reset input so same file can be picked again
  e.target.value = '';
}

function renderImageBox(box) {
  const div = document.createElement('div');
  div.className = 'image-box';
  div.id = box.id;
  div.style.left = box.x + 'px';
  div.style.top = box.y + 'px';
  div.style.width = box.width + 'px';
  div.style.height = box.height + 'px';

  const img = document.createElement('img');
  img.src = box.src;
  img.alt = 'Uploaded image';

  div.appendChild(img);
  content.appendChild(div);
  makeDraggable(div, box);
}

// Draggable helper — uses pointer events and attaches temporary handlers per drag
function makeDraggable(element, box) {
  element.addEventListener('pointerdown', (ev) => {
    // don't start drag when interacting with textarea
    if (ev.target.tagName === 'TEXTAREA') return;
    ev.preventDefault();
    const pid = ev.pointerId;
    element.setPointerCapture && element.setPointerCapture(pid);

    const startX = ev.clientX;
    const startY = ev.clientY;
    const startLeft = box.x;
    const startTop = box.y;

    // Select visually
    document.querySelectorAll('.text-box, .link-box, .image-box').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedBox = box.id;

    function onMove(e) {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      box.x = startLeft + dx;
      box.y = startTop + dy;
      element.style.left = box.x + 'px';
      element.style.top = box.y + 'px';
    }

    function onUp(e) {
      if (e.pointerId !== pid) return;
      element.releasePointerCapture && element.releasePointerCapture(pid);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

// Erase by removing strokes that have points near the pointer
function eraseAt(pos) {
  const radius = Math.max(8, brushSize * 3);
  strokes = strokes.filter(stroke => {
    if (!stroke.points) return true;
    const collides = stroke.points.some(pt => {
      const dx = pt.x - pos.x;
      const dy = pt.y - pos.y;
      return (dx * dx + dy * dy) <= (radius * radius);
    });
    return !collides;
  });
  redrawCanvas();
}

function clearCanvas() {
  strokes = [];
  redrawCanvas();
}

// Save snapshot (strokes + boxes + image) to GitHub (requires PAT)
// Note: GitHub API CORS may block calls from file:// — host via GitHub Pages or run locally via server
async function saveToGitHub() {
  try {
    const token = prompt('GitHub Personal Access Token (repo permissions):');
    if (!token) return;
    const repo = prompt('Repository (username/repo-name):');
    if (!repo) return;
    const filename = prompt('Filename (e.g. notebook.json):', 'notebook-' + new Date().toISOString().slice(0,10) + '.json');
    if (!filename) return;

    const data = {
      timestamp: new Date().toISOString(),
      strokes,
      boxes,
      canvas: canvas.toDataURL()
    };

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Save notebook ${filename}`,
        content
      })
    });

    if (resp.ok) {
      alert('✅ Saved to GitHub!');
    } else {
      const err = await resp.json();
      console.error('GitHub save error', err);
      alert('❌ Error saving to GitHub: ' + (err.message || resp.status));
    }
  } catch (err) {
    console.error(err);
    alert('❌ Error: ' + err.message);
  }
}

// Start
init();

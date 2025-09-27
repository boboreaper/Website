import React, { useEffect, useRef, useState } from "react";
import { Pen, Type, Image, Link, Eraser, Plus, X, Trash2, Bold, Italic, Settings, Palette, Sliders } from "lucide-react";

export default function LearningNotebook() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("none"); // none | draw | text | link | erase
  const [settingsVisible, setSettingsVisible] = useState(false);

  // drawing state
  const [strokes, setStrokes] = useState([]);
  const currentStrokeRef = useRef(null);
  const drawingRef = useRef(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushStyle, setBrushStyle] = useState("round");

  // grid
  const GRID = 32;

  // content boxes (text / link / image)
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);

  // Add a ref for managing text editing
  const textBoxRefs = useRef({});

  function handleTextInput(boxId, newText) {
    updateBox(boxId, { text: newText });
  }

  // last known pointer (for placing images when file chosen)
  const lastPointerRef = useRef({ x: 200, y: 200 });

  // helper: get pointer pos relative to container
  function getPointerPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
  }

  // keep last pointer updated for image placement
  useEffect(() => {
    function onMove(e) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      lastPointerRef.current = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // canvas drawing/render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // draw strokes
    for (const s of strokes) {
      if (!s.points || s.points.length === 0) continue;
      ctx.lineJoin = s.style || "round";
      ctx.lineCap = s.style || "round";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }

    // draw current stroke
    const cur = currentStrokeRef.current;
    if (cur) {
      ctx.lineJoin = cur.style || "round";
      ctx.lineCap = cur.style || "round";
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = cur.size;
      ctx.beginPath();
      ctx.moveTo(cur.points[0].x, cur.points[0].y);
      for (let i = 1; i < cur.points.length; i++) ctx.lineTo(cur.points[i].x, cur.points[i].y);
      ctx.stroke();
    }
  }, [strokes, brushColor, brushSize, brushStyle]);

  // pointer handlers for drawing & erasing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function down(e) {
      const pos = getPointerPos(e);
      if (mode === "draw") {
        drawingRef.current = true;
        currentStrokeRef.current = { color: brushColor, size: brushSize, style: brushStyle, points: [pos] };
      } else if (mode === "erase") {
        eraseAt(pos);
      }
    }
    function move(e) {
      const pos = getPointerPos(e);
      if (mode === "draw" && drawingRef.current && currentStrokeRef.current) {
        currentStrokeRef.current.points.push(pos);
        setStrokes((s) => s.slice());
      } else if (mode === "erase" && e.buttons === 1) {
        eraseAt(pos);
      }
    }
    function up() {
      if (mode === "draw" && drawingRef.current) {
        drawingRef.current = false;
        if (currentStrokeRef.current) {
          setStrokes((s) => [...s, currentStrokeRef.current]);
          currentStrokeRef.current = null;
        }
      }
    }

    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [mode, brushColor, brushSize, brushStyle, strokes]);

  function eraseAt(pos) {
    const R = Math.max(8, brushSize * 1.2);
    setStrokes((prev) => prev.filter((stroke) => {
      for (const p of stroke.points) {
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        if (dx * dx + dy * dy <= R * R) return false;
      }
      return true;
    }));
  }

  // placing text/link boxes by clicking the container
  useEffect(() => {
    const ctr = containerRef.current;
    if (!ctr) return;
    function onDown(e) {
      const target = e.target;
      if (target.closest('.menu-ignore')) return;
      const pos = getPointerPos(e);
      if (mode === 'text') addTextAt(pos);
      if (mode === 'link') addLinkAt(pos);
    }
    ctr.addEventListener('pointerdown', onDown);
    return () => ctr.removeEventListener('pointerdown', onDown);
  }, [mode]);

  function snapToGrid(x, y) {
    return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID };
  }

  function addTextAt(pos) {
    const { x, y } = snapToGrid(pos.x, pos.y);
    const id = Date.now() + Math.random();
    const box = {
      id,
      type: 'text',
      x, y,
      width: 280,
      height: 80,
      text: 'Írj ide',
      color: '#ffffff',
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: '400',
      fontStyle: 'normal',
    };
    setBoxes((b) => [...b, box]);
    setSelectedBox(id);
    setMode('none');
  }

  function addLinkAt(pos) {
    const url = prompt('Hivatkozás URL (https://...)');
    if (!url) return;
    const { x, y } = snapToGrid(pos.x, pos.y);
    const id = Date.now() + Math.random();
    const box = { id, type: 'link', x, y, width: 260, height: 40, url, text: url, color: '#9be2ff' };
    setBoxes((b) => [...b, box]);
    setSelectedBox(id);
    setMode('none');
  }

  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const pos = snapToGrid(lastPointerRef.current.x, lastPointerRef.current.y);
      const id = Date.now() + Math.random();
      const box = { id, type: 'image', x: pos.x - 80, y: pos.y - 60, width: 160, height: 120, src };
      setBoxes((b) => [...b, box]);
      setSelectedBox(id);
      setMode('none');
    };
    reader.readAsDataURL(file);
  }

  function onFileInput(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    handleImageFile(f);
    e.target.value = null;
  }

  // dragging boxes
  const dragRef = useRef({});
  useEffect(() => {
    function down(e) {
      const el = e.target.closest('.notebook-box');
      if (!el) return;
      const id = el.dataset.id;
      if (!id) return;
      const pos = getPointerPos(e);
      const box = boxes.find((b) => String(b.id) === String(id));
      if (!box) return;
      dragRef.current = { id, startX: pos.x, startY: pos.y, origX: box.x, origY: box.y, dragging: true };
      setSelectedBox(box.id);
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!dragRef.current.dragging) return;
      const pos = getPointerPos(e);
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      setBoxes((prev) => prev.map((b) => (String(b.id) === String(dragRef.current.id) ? { ...b, x: Math.round((dragRef.current.origX + dx) / GRID) * GRID, y: Math.round((dragRef.current.origY + dy) / GRID) * GRID } : b)));
    }
    function up() {
      if (dragRef.current.dragging) dragRef.current = {};
    }

    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
  }, [boxes]);

  function updateBox(id, patch) {
    setBoxes((prev) => prev.map((b) => (String(b.id) === String(id) ? { ...b, ...patch } : b)));
  }

  function deleteSelectedBox() {
    if (!selectedBox) return;
    setBoxes((prev) => prev.filter((b) => String(b.id) !== String(selectedBox)));
    setSelectedBox(null);
  }

  function pickMode(m) {
    setMode(m);
    setMenuOpen(false);
    setSettingsVisible(true);
  }

  function clearCanvas() {
    setStrokes([]);
  }

  // Apple-style radial menu positioning
  const radialButtons = [
    { mode: 'draw', icon: Pen, title: 'Rajzolás', angle: -90 },
    { mode: 'text', icon: Type, title: 'Szöveg', angle: -45 },
    { mode: 'link', icon: Link, title: 'Hivatkozás', angle: 0 },
    { icon: Image, title: 'Kép beillesztése', angle: 45, isImage: true },
    { mode: 'erase', icon: Eraser, title: 'Radír', angle: 90 },
  ];

  const getRadialPosition = (angle, radius = 80) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius,
    };
  };

  // UI: top-middle settings block (Apple-style glassmorphism)
  function TopSettings() {
    const sel = boxes.find((b) => String(b.id) === String(selectedBox));
    if (sel) {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-96 bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 z-50 menu-ignore shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-white/80" />
              <span className="font-semibold text-white text-lg">Szerkesztés</span>
            </div>
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 text-sm font-medium" 
                onClick={() => setSelectedBox(null)}
              >
                Bezár
              </button>
              <button 
                className="px-4 py-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-all duration-200 text-sm font-medium flex items-center gap-2" 
                onClick={deleteSelectedBox}
              >
                <Trash2 className="w-4 h-4" />
                Törlés
              </button>
            </div>
          </div>

          {sel.type === 'text' && (
            <div className="text-white space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-white/70" />
                  <label className="text-sm font-medium text-white/90">Szín</label>
                </div>
                <input 
                  type="color" 
                  value={sel.color} 
                  onChange={(e) => updateBox(sel.id, { color: e.target.value })} 
                  className="w-12 h-8 rounded-lg border-0 bg-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Méret: {sel.fontSize}px
                </label>
                <input 
                  type="range" 
                  min={10} 
                  max={72} 
                  value={sel.fontSize} 
                  onChange={(e) => updateBox(sel.id, { fontSize: Number(e.target.value) })} 
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  value={sel.fontFamily} 
                  onChange={(e) => updateBox(sel.id, { fontFamily: e.target.value })} 
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="sans-serif" className="bg-black text-white">Sans-serif</option>
                  <option value="serif" className="bg-black text-white">Serif</option>
                  <option value="monospace" className="bg-black text-white">Monospace</option>
                </select>
                
                <button 
                  className={`p-2 rounded-lg transition-all duration-200 ${sel.fontWeight === '700' ? 'bg-blue-500/80 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`} 
                  onClick={() => updateBox(sel.id, { fontWeight: sel.fontWeight === '700' ? '400' : '700' })}
                >
                  <Bold className="w-4 h-4" />
                </button>
                
                <button 
                  className={`p-2 rounded-lg transition-all duration-200 ${sel.fontStyle === 'italic' ? 'bg-blue-500/80 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`} 
                  onClick={() => updateBox(sel.id, { fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })}
                >
                  <Italic className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Szélesség: {sel.width}px</label>
                <input 
                  type="range" 
                  min={80} 
                  max={800} 
                  value={sel.width} 
                  onChange={(e) => updateBox(sel.id, { width: Number(e.target.value) })} 
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Magasság: {sel.height}px</label>
                <input 
                  type="range" 
                  min={40} 
                  max={400} 
                  value={sel.height} 
                  onChange={(e) => updateBox(sel.id, { height: Number(e.target.value) })} 
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
                />
              </div>
            </div>
          )}

          {sel.type === 'link' && (
            <div className="text-white space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">URL</label>
                <input 
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50" 
                  value={sel.url} 
                  onChange={(e) => updateBox(sel.id, { url: e.target.value, text: e.target.value })} 
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-white/70" />
                  <label className="text-sm font-medium text-white/90">Szín</label>
                </div>
                <input 
                  type="color" 
                  value={sel.color} 
                  onChange={(e) => updateBox(sel.id, { color: e.target.value })} 
                  className="w-12 h-8 rounded-lg border-0 bg-white/10"
                />
              </div>
            </div>
          )}

          {sel.type === 'image' && (
            <div className="text-white space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Szélesség: {sel.width}px</label>
                <input 
                  type="range" 
                  min={40} 
                  max={1000} 
                  value={sel.width} 
                  onChange={(e) => updateBox(sel.id, { width: Number(e.target.value) })} 
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Magasság: {sel.height}px</label>
                <input 
                  type="range" 
                  min={40} 
                  max={800} 
                  value={sel.height} 
                  onChange={(e) => updateBox(sel.id, { height: Number(e.target.value) })} 
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (!settingsVisible) return null;
    
    if (mode === 'draw') {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-96 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 z-50 menu-ignore shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Pen className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-semibold text-white text-lg">Toll beállítások</span>
            </div>
            <button 
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 text-sm font-medium border border-white/10" 
              onClick={() => setSettingsVisible(false)}
            >
              Bezár
            </button>
          </div>
          
          <div className="text-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-white/70" />
                </div>
                <label className="text-sm font-medium text-white/90">Szín</label>
              </div>
              <input 
                type="color" 
                value={brushColor} 
                onChange={(e) => setBrushColor(e.target.value)} 
                className="w-12 h-10 rounded-xl border-2 border-white/20 bg-white/5 cursor-pointer hover:border-white/30 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <Sliders className="w-4 h-4 text-white/70" />
                  </div>
                  <label className="text-sm font-medium text-white/90">Méret</label>
                </div>
                <span className="text-white/70 font-medium">{brushSize}px</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={40} 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))} 
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer brush-slider"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white/70" />
                </div>
                <label className="text-sm font-medium text-white/90">Stílus</label>
              </div>
              <select 
                value={brushStyle} 
                onChange={(e) => setBrushStyle(e.target.value)} 
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all duration-200"
              >
                <option value="round" className="bg-gray-900 text-white">Kerek</option>
                <option value="square" className="bg-gray-900 text-white">Négyzet</option>
              </select>
            </div>
            
            <div className="pt-2">
              <div className="text-sm font-medium text-white/70 mb-3">Gyors színek</div>
              <div className="flex gap-3">
                <button 
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 text-sm font-medium border border-white/10 hover:border-white/20" 
                  onClick={() => setBrushColor('#ffffff')}
                >
                  Fehér
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-200 transition-all duration-200 text-sm font-medium border border-yellow-500/20 hover:border-yellow-500/30" 
                  onClick={() => setBrushColor('#ffcc00')}
                >
                  Sárga
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-200 transition-all duration-200 text-sm font-medium border border-green-500/20 hover:border-green-500/30" 
                  onClick={() => setBrushColor('#00cc99')}
                >
                  Zöld
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 transition-all duration-200 text-sm font-medium border border-red-500/20 hover:border-red-500/30" 
                  onClick={() => setBrushColor('#ff4444')}
                >
                  Piros
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (mode === 'text') {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-80 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 z-50 menu-ignore shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Type className="w-5 h-5 text-green-400" />
              </div>
              <span className="font-semibold text-white text-lg">Szöveg mód</span>
            </div>
            <button 
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 text-sm font-medium border border-white/10" 
              onClick={() => setSettingsVisible(false)}
            >
              Bezár
            </button>
          </div>
          
          <div className="text-white/80 text-sm bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-400 text-sm">📝</span>
                </div>
                <p className="text-white/90 font-medium leading-relaxed">Kattints bárhová a vászonra új szövegdoboz létrehozásához</p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-400 text-sm">✏️</span>
                </div>
                <p className="text-white/90 font-medium leading-relaxed">A doboz kiválasztása után további formázási lehetőségek jelennek meg</p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-400 text-sm">🎨</span>
                </div>
                <p className="text-white/90 font-medium leading-relaxed">Szín, méret, betűtípus és szélesség mind módosítható</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (mode === 'link') {
      return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 z-50 menu-ignore shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white text-lg">Hivatkozás mód</span>
            </div>
            <button 
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 text-sm font-medium" 
              onClick={() => setSettingsVisible(false)}
            >
              Bezár
            </button>
          </div>
          
          <div className="text-white/80 text-sm bg-white/5 rounded-2xl p-4">
            <p className="mb-2">🔗 Kattints a vászonra hivatkozás hozzáadásához</p>
            <p>🌐 Add meg az URL-t a megjelenő párbeszédablakban</p>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div ref={containerRef} className="w-screen h-screen bg-black relative select-none">
      {/* Faint squared grid */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          backgroundColor: '#000', 
          backgroundImage: 'linear-gradient(#2f2f2f 1px, transparent 1px), linear-gradient(90deg, #2f2f2f 1px, transparent 1px)', 
          backgroundSize: `${GRID}px ${GRID}px`, 
          opacity: 0.25 
        }} 
      />

      {/* Drawing canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {/* Boxes rendering */}
      {boxes.map((b) => (
        <div 
          key={b.id} 
          data-id={b.id} 
          className="notebook-box absolute menu-ignore transition-all duration-200 hover:shadow-lg" 
          style={{ 
            left: b.x, 
            top: b.y, 
            width: b.width, 
            height: b.height, 
            zIndex: selectedBox === b.id ? 60 : 40,
            transform: selectedBox === b.id ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          {b.type === 'text' && (
            <textarea
              ref={(el) => {
                if (el) textBoxRefs.current[b.id] = el;
              }}
              value={b.text}
              onChange={(e) => updateBox(b.id, { text: e.target.value })}
              onFocus={() => setSelectedBox(b.id)}
              placeholder="Írj ide..."
              style={{ 
                color: b.color, 
                fontSize: b.fontSize, 
                fontFamily: b.fontFamily, 
                fontWeight: b.fontWeight, 
                fontStyle: b.fontStyle, 
                outline: 'none', 
                background: selectedBox === b.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                padding: 12, 
                borderRadius: 16,
                border: selectedBox === b.id ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                width: '100%',
                height: '100%',
                resize: 'none',
                overflow: 'hidden'
              }}
              className="text-box-content"
            />
          )}
          )}

          {b.type === 'link' && (
            <div 
              onDoubleClick={() => window.open(b.url, '_blank')} 
              style={{ 
                color: b.color, 
                background: selectedBox === b.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                padding: 12, 
                borderRadius: 16, 
                border: selectedBox === b.id ? '2px solid rgba(59, 130, 246, 0.5)' : '1px dashed rgba(255,255,255,0.2)', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} 
              onClick={() => setSelectedBox(b.id)}
              className="h-full flex items-center text-sm font-medium hover:bg-white/10"
            >
              <Link className="w-4 h-4 mr-2 opacity-70" />
              {b.text}
            </div>
          )}

          {b.type === 'image' && (
            <img 
              src={b.src} 
              alt="img" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                borderRadius: 16,
                border: selectedBox === b.id ? '2px solid rgba(59, 130, 246, 0.5)' : 'none',
                transition: 'all 0.2s ease'
              }} 
              onClick={() => setSelectedBox(b.id)}
              className="cursor-pointer hover:opacity-90"
            />
          )}
        </div>
      ))}

      {/* Top-middle settings */}
      <TopSettings />

      {/* Apple-style floating action button with radial menu */}
      <div className="fixed top-6 left-6 z-50">
        <div className="relative">
          {/* Main FAB */}
          <button 
            onClick={() => setMenuOpen((v) => !v)} 
            className={`menu-ignore w-14 h-14 rounded-full bg-gray-800/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-gray-700/90 active:scale-95 ${menuOpen ? 'rotate-45' : 'rotate-0'}`}
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)'
            }}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </button>

          {/* Radial menu buttons */}
          {menuOpen && (
            <>
              {/* Background overlay for smooth animation */}
              <div className="absolute inset-0 w-48 h-48 -translate-x-6 -translate-y-6 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full blur-3xl animate-pulse" />
              </div>
              
              {radialButtons.map((btn, idx) => {
                const pos = getRadialPosition(btn.angle);
                const Icon = btn.icon;
                
                return (
                  <button
                    key={btn.mode || btn.title}
                    onClick={() => {
                      if (btn.isImage) {
                        fileInputRef.current && fileInputRef.current.click();
                        setMenuOpen(false);
                      } else if (btn.mode) {
                        pickMode(btn.mode);
                      }
                    }}
                    className="pointer-events-auto absolute w-12 h-12 rounded-full bg-gray-800/95 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-gray-700/95 active:scale-95 shadow-2xl"
                    style={{ 
                      left: pos.x + 28,
                      top: pos.y + 28,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${idx * 50}ms`,
                      animation: 'fadeInScale 0.3s ease-out forwards',
                      opacity: 0,
                      scale: 0.8,
                      boxShadow: '0 8px 25px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
                    }}
                    title={btn.title}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInput} className="hidden" />

      {/* Bottom-right helper with Apple-style design */}
      <div className="fixed bottom-6 right-6 text-white/60 text-sm select-none">
        <div className="bg-black/60 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="font-medium">Kattints a </span>
            <Plus className="w-4 h-4 text-blue-400" />
            <span className="font-medium"> gombra az eszközökhöz</span>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeInScale {
          to {
            opacity: 1;
            scale: 1;
          }
        }
        
        .brush-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .brush-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5), 0 3px 6px rgba(0,0,0,0.3);
        }
        
        .brush-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"] {
          background: rgba(255,255,255,0.1);
        }
        
        input[type="color"] {
          border: 2px solid rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        input[type="color"]:hover {
          border-color: rgba(255,255,255,0.4);
          transform: scale(1.05);
        }
        
        input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 6px;
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 0;
          border: none;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}

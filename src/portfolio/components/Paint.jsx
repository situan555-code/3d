import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'
];

// Hybrid stamps: image-based S logos + built-in emoji stamps
const STAMPS = [
  { type: 'image', src: '/stamps/stamp1.png', label: 'S Logo (Neon)' },
  { type: 'emoji', emoji: '⭐', label: 'Star' },
  { type: 'emoji', emoji: '❤️', label: 'Heart' },
  { type: 'emoji', emoji: '🔥', label: 'Fire' },
  { type: 'emoji', emoji: '💀', label: 'Skull' },
  { type: 'emoji', emoji: '🎨', label: 'Art' },
  { type: 'emoji', emoji: '✨', label: 'Sparkle' },
  { type: 'emoji', emoji: '🚀', label: 'Rocket' },
];

const Paint = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawing = useRef(false);

  const [activeColor, setActiveColor] = useState('#000000');
  const [activeTool, setActiveTool] = useState('pencil'); // 'pencil' | 'eraser' | 'stamp'
  const [activeStamp, setActiveStamp] = useState(0);
  const [brushSize, setBrushSize] = useState(2);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ghost Tracker State
  const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);

  // Initialize Canvas — responsive sizing
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    // Only resize if dimensions actually changed
    if (canvas.width === w && canvas.height === h) return;

    // Save current drawing
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    canvas.width = w;
    canvas.height = h;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Restore previous drawing
    ctx.putImageData(imageData, 0, 0);

    contextRef.current = ctx;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    contextRef.current = ctx;

    // Observe resizes
    const observer = new ResizeObserver(() => initCanvas());
    const wrapper = canvas.parentElement;
    if (wrapper) observer.observe(wrapper);

    return () => observer.disconnect();
  }, [initCanvas]);

  const getCoordinates = (e) => {
    // If it's a touch event, calculate relative offset manually
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    // Mouse fallback explicitly relies on offsets
    return {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
  };

  const applyStamp = (x, y) => {
    const stamp = STAMPS[activeStamp];
    if (!contextRef.current || !stamp) return;
    const ctx = contextRef.current;

    if (stamp.type === 'emoji') {
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stamp.emoji, x, y);
    } else if (stamp.type === 'image') {
      const img = new window.Image();
      img.src = stamp.src;
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const maxSize = 120;
        let dw = img.width, dh = img.height;
        if (dw > maxSize || dh > maxSize) {
          const r = Math.min(maxSize / dw, maxSize / dh);
          dw *= r; dh *= r;
        }
        // Chroma-key: remove background color (sampled from top-left pixel)
        const off = document.createElement('canvas');
        off.width = dw; off.height = dh;
        const oc = off.getContext('2d');
        oc.drawImage(img, 0, 0, dw, dh);
        const id = oc.getImageData(0, 0, dw, dh);
        const d = id.data;
        const bgR = d[0], bgG = d[1], bgB = d[2], tol = 120;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - bgR) < tol && Math.abs(d[i+1] - bgG) < tol && Math.abs(d[i+2] - bgB) < tol) {
            d[i+3] = 0;
          }
        }
        oc.putImageData(id, 0, 0);
        ctx.drawImage(off, x - dw/2, y - dh/2);
      };
    }
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    
    if (activeTool === 'stamp') {
      applyStamp(x, y);
      return; // Do not trigger continuous drawing mode for stamps
    }

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    isDrawing.current = true;

    // Dot on single click helper
    draw(e); 
  };

  const draw = (e) => {
    const { x, y } = getCoordinates(e);

    // Update ghost tracking overlay
    if (activeTool === 'stamp') {
      setCursorPos({ x, y });
    }

    if (!isDrawing.current || !contextRef.current || activeTool === 'stamp') return;

    const ctx = contextRef.current;
    ctx.lineTo(x, y);

    // Apply tools
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : activeColor;
    ctx.lineWidth = activeTool === 'eraser' ? brushSize * 4 : brushSize;

    ctx.stroke();
  };

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    isDrawing.current = false;
  };

  const handleSaveAs = () => {
    if (!canvasRef.current) return;
    setDropdownOpen(false);
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'my_masterpiece.png';
    link.href = dataUrl;
    link.click();
  };

  const handleClear = () => {
    if (!canvasRef.current || !contextRef.current) return;
    setDropdownOpen(false);
    contextRef.current.fillStyle = '#ffffff';
    contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="paint-container">
      {/* Menu Nav */}
      <div className="paint-menubar">
        <div className="paint-menu-item">
          <span onClick={() => setDropdownOpen(!dropdownOpen)}>File</span>
          {dropdownOpen && (
            <div className="paint-dropdown bevel-outset">
              <div className="paint-dropdown-item" onClick={handleClear}>New</div>
              <div className="paint-dropdown-item" onClick={handleSaveAs}>Save As...</div>
            </div>
          )}
        </div>
      </div>

      <div className="paint-body">
        {/* Left Toolbar */}
        <div className="paint-sidebar">
          <div 
            className={`paint-tool ${activeTool === 'pencil' ? 'active-tool bevel-inset' : 'bevel-outset'}`}
            onClick={() => setActiveTool('pencil')}
            title="Pencil"
          >
            ✏️
          </div>
          <div 
            className={`paint-tool ${activeTool === 'eraser' ? 'active-tool bevel-inset' : 'bevel-outset'}`}
            onClick={() => setActiveTool('eraser')}
            title="Eraser"
          >
            🧼
          </div>
          <div 
            className={`paint-tool ${activeTool === 'stamp' ? 'active-tool bevel-inset' : 'bevel-outset'}`}
            onClick={() => setActiveTool('stamp')}
            title="Curated Stamps"
          >
            ⭐
          </div>
        </div>

        {/* Canvas Workspace */}
        <div 
           className="paint-canvas-wrapper bevel-inset" 
           style={{ position: 'relative', overflow: 'hidden', flex: 1 }}
           onPointerEnter={() => setIsHovering(true)}
           onPointerLeave={() => { setIsHovering(false); stopDrawing(); }}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%' }}
            className={activeTool === 'stamp' ? 'canvas-stamp' : (activeTool === 'eraser' ? 'canvas-eraser' : 'canvas-pencil')}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
          />
          
          {/* Ghost Stamp Overlay */}
          {activeTool === 'stamp' && isHovering && STAMPS[activeStamp] && (
            STAMPS[activeStamp].type === 'image' ? (
              <img
                src={STAMPS[activeStamp].src}
                alt="ghost"
                style={{
                  position: 'absolute',
                  top: cursorPos.y,
                  left: cursorPos.x,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '120px',
                  maxHeight: '120px',
                  opacity: 0.4,
                  pointerEvents: 'none',
                  zIndex: 20
                }}
              />
            ) : (
              <span
                style={{
                  position: 'absolute',
                  top: cursorPos.y,
                  left: cursorPos.x,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '48px',
                  opacity: 0.5,
                  pointerEvents: 'none',
                  zIndex: 20
                }}
              >{STAMPS[activeStamp].emoji}</span>
            )
          )}
        </div>
      </div>

      {/* Footer Palette */}
      <div className="paint-palette-bar">
        {activeTool === 'stamp' ? (
          // Render Stamp Selection UI when stamp tool is active
          STAMPS.map((stamp, index) => (
            <div
              key={stamp.label}
              className={`paint-stamp-swatch ${activeStamp === index ? 'active-swatch bevel-inset' : 'bevel-outset'}`}
              onClick={() => setActiveStamp(index)}
              title={stamp.label}
            >
              {stamp.type === 'image' ? (
                <img src={stamp.src} alt={stamp.label} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              ) : (
                stamp.emoji
              )}
            </div>
          ))
        ) : (
          // Render classic colors when drawing tools are active
          COLORS.map((hex) => (
            <div
              key={hex}
              className={`paint-color-swatch ${activeColor === hex ? 'active-swatch bevel-inset' : 'bevel-outset'}`}
              style={{ backgroundColor: hex }}
              onClick={() => setActiveColor(hex)}
              title={hex}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Paint;

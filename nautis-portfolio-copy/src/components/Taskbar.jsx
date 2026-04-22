import React, { useState, useEffect } from 'react';

const Taskbar = ({ windows, toggleMinimize, bringToFront, onStartClick, isStartMenuOpen }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="taskbar bevel-outset">
      <button 
        className={`start-btn ${isStartMenuOpen ? 'bevel-inset' : 'bevel-outset'}`} 
        style={{ marginRight: '16px' }}
        onClick={onStartClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '14px', filter: 'grayscale(100%)' }}>🏁</span>
          <span style={{ fontWeight: 'bold', color: '#000' }}>Start</span>
        </div>
      </button>

      <div style={{ display: 'flex', flexGrow: 1, gap: '4px' }}>
        {windows.map((win) => {
          if (!win.isOpen) return null;
          const isFocused = !win.isMinimized; 
          return (
            <div
              key={win.id}
              className={`taskbar-tab ${isFocused ? 'bevel-inset' : 'bevel-outset'}`}
              onClick={() => {
                if (win.isMinimized) {
                  toggleMinimize(win.id);
                } else {
                  // If it's already open and focused, minimize it. If it's open but behind, bring to front.
                  // For simplicity, let's just toggle minimize unless we know it's not the highest z-index.
                  // Without tracking exact active window focus state globally, just toggling minimize is fine.
                  toggleMinimize(win.id);
                }
              }}
            >
              {win.title}
            </div>
          );
        })}
      </div>

      <div className="taskbar-time bevel-inset" style={{ padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center' }}>
        {time}
      </div>
    </div>
  );
};

export default Taskbar;

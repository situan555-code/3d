import React, { useState, useEffect } from 'react';

const lines = [
  "NautisBIOS Version 1.0.4",
  "Copyright (c) 1995-2026, NAUTIS NEFF.",
  "",
  "Main Processor: NAUTIS CPU 1000MHz",
  "Memory Testing: 65536K OK",
  "",
  "Detecting Primary Master ... CD-ROM",
  "Detecting Primary Slave  ... None",
  "Detecting Secondary Master ... IDE Hard Disk",
  "",
  "Loading OS Kernel...",
  "Mounting Graphic Interface...",
  "Welcome back."
];

const BootScreen = ({ onComplete }) => {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex < lines.length) {
      // Small random variations in load time for authenticity
      const delay = currentLineIndex === 4 ? 800 : currentLineIndex === 10 ? 1200 : 150;
      const timer = setTimeout(() => {
        setDisplayedLines(prev => [...prev, lines[currentLineIndex]]);
        setCurrentLineIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const endTimer = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(endTimer);
    }
  }, [currentLineIndex, onComplete]);

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: '"VT323", "Courier New", Courier, monospace',
      fontSize: '20px',
      padding: '24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999999,
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {displayedLines.map((line, i) => (
        <div key={i} style={{ minHeight: '24px' }}>{line}</div>
      ))}
      <div style={{ width: '12px', height: '22px', backgroundColor: '#fff', marginTop: '4px', animation: 'blink 1s step-end infinite' }} />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div className="crt-overlay"></div>
    </div>
  );
};

export default BootScreen;

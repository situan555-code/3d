import React, { useState, useCallback } from 'react';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import FolderView from './components/FolderView';
import CaseStudyViewer from './components/CaseStudyViewer';
import StartMenu from './components/StartMenu';
import BootScreen from './components/BootScreen';
import { fileSystem } from './os/fileSystem';

const App = () => {
  const [clippyVisible, setClippyVisible] = useState(false);
  const [clippyPhase, setClippyPhase] = useState(0); // 0=hidden, 1=speech bubble, 2=smack, 3=done
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [isBooted, setIsBooted] = useState(false);
  
  // Define all windows in the OS recursively mapped from the OS file system registry.
  const [windows, setWindows] = useState(
    fileSystem.map(win => ({
      ...win,
      isOpen: false,
      isMinimized: false,
      zIndex: 10
    }))
  );

  const bringToFront = (id) => {
    setWindows((prevWindows) => {
      const maxZ = Math.max(...prevWindows.map((w) => w.zIndex), 0);
      // Give the new active window a guaranteed unique max z-index
      return prevWindows.map((win) =>
        win.id === id ? { ...win, zIndex: maxZ + 1 } : win
      );
    });
  };

  const openWindow = (id) => {
    // Check if the user is trying to open a URL
    if (id === 'linkedin') {
      window.open('https://www.linkedin.com/in/nautis555', '_blank');
      return;
    }
    
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, isOpen: true, isMinimized: false } : win
      )
    );
    bringToFront(id);
    setStartMenuOpen(false);
  };

  const closeWindow = (id) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, isOpen: false } : win))
    );
  };

  const toggleMinimize = (id) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, isMinimized: !win.isMinimized } : win
      )
    );
    const targetWin = windows.find(w => w.id === id);
    if (targetWin && targetWin.isMinimized) {
      bringToFront(id);
    }
  };

  const updatePosition = (id, x, y) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, position: { x, y } } : win
      )
    );
  };

  // The legendary Clippy Easter Egg
  const handleStartClick = useCallback(() => {
    if (clippyVisible) return; // Don't re-trigger while active
    
    setClippyVisible(true);
    setClippyPhase(1); // Show speech bubble: "Good idea."

    // After 1.5s, transition to smack phase
    setTimeout(() => {
      setClippyPhase(2); // Clippy smacks
    }, 1500);

    // After 2.2s, open all windows in a rapid stagger
    setTimeout(() => {
      setClippyPhase(3);
      const openableWindows = fileSystem.filter(w => w.id !== 'linkedin').sort((a, b) => {
        if (a.id === 'paint') return -1;
        if (b.id === 'paint') return 1;
        if (a.id === 'about_me') return 1;
        if (b.id === 'about_me') return -1;
        return 0;
      });
      
      openableWindows.forEach((win, i) => {
        setTimeout(() => {
          setWindows((prev) => {
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            return prev.map((w) =>
              w.id === win.id
                ? { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 }
                : w
            );
          });
        }, i * 120); 
      });
    }, 2200);

    // After all windows open + a beat, dismiss Clippy
    setTimeout(() => {
      setClippyVisible(false);
      setClippyPhase(0);
    }, 2200 + (fileSystem.length * 120) + 800);
  }, [clippyVisible]);

  // We inject openWindow, windows, and active state to the content
  const injectPropsToContent = (content, isTopMost) => {
    if (React.isValidElement(content)) {
      if (content.type === FolderView) {
        return React.cloneElement(content, { windows, openWindow, isActive: isTopMost });
      }
      return React.cloneElement(content, { isActive: isTopMost });
    }
    return content;
  };

  const desktopWindows = windows.filter(w => w.onDesktop);

  return (
    <>
      {!isBooted && <BootScreen onComplete={() => setIsBooted(true)} />}
      
      {isBooted && (
        <>
          <Desktop 
            desktopIcons={desktopWindows} 
            openWindows={windows} 
            openWindow={openWindow} 
            closeWindow={closeWindow} 
            updatePosition={updatePosition} 
            bringToFront={bringToFront} 
            injectPropsToContent={injectPropsToContent}
          />
          {startMenuOpen && (
            <StartMenu 
              openWindow={openWindow} 
              closeMenu={() => setStartMenuOpen(false)} 
              onEasterEggClick={handleStartClick} 
            />
          )}
          <Taskbar 
            windows={windows} 
            toggleMinimize={toggleMinimize} 
            bringToFront={bringToFront} 
            onStartClick={() => setStartMenuOpen(!startMenuOpen)}
            isStartMenuOpen={startMenuOpen}
          />

          {/* Clippy Easter Egg Overlay */}
          {clippyVisible && (
            <div className="clippy-overlay">
              {/* Speech Bubble */}
              {(clippyPhase === 1 || clippyPhase === 2) && (
                <div className={`clippy-speech ${clippyPhase === 2 ? 'clippy-speech-exit' : ''}`}>
                  <span>Good idea.</span>
                  <div className="clippy-speech-tail"></div>
                </div>
              )}
              
              {/* Clippy himself */}
              <img 
                src="/clippy_new.png" 
                alt="Clippy"
                className={`clippy-img ${
                  clippyPhase === 1 ? 'clippy-enter' : 
                  clippyPhase === 2 ? 'clippy-smack' : 
                  clippyPhase === 3 ? 'clippy-exit' : ''
                }`}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default App;

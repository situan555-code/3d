import React from 'react';
import Window from './Window';
import DesktopIcon from './DesktopIcon';

const Desktop = ({ desktopIcons, openWindows, openWindow, closeWindow, updatePosition, bringToFront, injectPropsToContent }) => {
  return (
    <div className="desktop">
      <div className="crt-overlay"></div>
      
      {/* Render Desktop Icons */}
      {desktopIcons.map((icon) => (
        <DesktopIcon
          key={icon.id}
          id={icon.id}
          title={icon.title}
          iconType={icon.iconType}
          position={icon.position}
          onDoubleClick={() => openWindow(icon.id)}
        />
      ))}

      {/* Render Windows */}
      {openWindows.map((win) => {
        if (!win.isOpen || win.isMinimized) return null;
        
        // Determine if this is the active/topmost window
        const maxZIndex = Math.max(...openWindows.filter(w => w.isOpen && !w.isMinimized).map(w => w.zIndex), 0);
        const isTopMost = win.zIndex === maxZIndex;

        return (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            content={injectPropsToContent(win.content, isTopMost)}
            position={win.position}
            zIndex={win.zIndex}
            isActive={isTopMost}
            updatePosition={updatePosition}
            closeWindow={() => closeWindow(win.id)}
            bringToFront={() => bringToFront(win.id)}
          />
        );
      })}
    </div>
  );
};

export default Desktop;

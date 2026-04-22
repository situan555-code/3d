import React, { useRef } from 'react';
import useDraggable from '../hooks/useDraggable';

const Window = ({ id, title, content, position, zIndex, isActive, updatePosition, closeWindow, bringToFront }) => {
  const windowRef = useRef(null);
  const { handlePointerDown } = useDraggable(id, position, updatePosition);

  return (
    <div
      className="win-window bevel-outset"
      style={{
        left: position.x,
        top: position.y,
        zIndex: zIndex,
      }}
      ref={windowRef}
      onPointerDown={() => bringToFront()}
    >
      <div
        className={`win-titlebar ${!isActive ? 'inactive' : ''}`}
        onPointerDown={(e) => {
          bringToFront();
          if (window.innerWidth > 768) {
            handlePointerDown(e);
          }
        }}
      >
        <span className="win-titlebar-text">{title}</span>
        <button
          className="win-close-btn bevel-outset"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag triggering on close
          onClick={(e) => {
            e.stopPropagation();
            closeWindow();
          }}
        >
          X
        </button>
      </div>
      <div className="win-content">{content}</div>
    </div>
  );
};

export default Window;

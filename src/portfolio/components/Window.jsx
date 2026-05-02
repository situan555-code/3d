import React, { useRef, useState, useContext, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import useDraggable from '../hooks/useDraggable';
import { GlobalOverlayContext, WindowOverlayContext } from '../contexts/OverlayState';

const Window = ({ id, title, content, position, zIndex, isActive, updatePosition, closeWindow, bringToFront }) => {
  const windowRef = useRef(null);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [overlayTarget, setOverlayTarget] = useState(null);
  const [contentRect, setContentRect] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [innerRect, setInnerRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const globalOverlayNode = useContext(GlobalOverlayContext);
  const { handlePointerDown } = useDraggable(id, position, updatePosition);

  useLayoutEffect(() => {
    if (outerRef.current && windowRef.current && innerRef.current) {
      // getBoundingClientRect is warped by 3D matrix, so we use precise DOM offsets.
      // element.offsetTop measures from the padding-box of the offsetParent.
      // We must add the offsetParent's border width (clientTop/clientLeft) to get the distance from the border-box!
      setContentRect({
        top: outerRef.current.offsetTop + windowRef.current.clientTop,
        left: outerRef.current.offsetLeft + windowRef.current.clientLeft,
        width: outerRef.current.offsetWidth,
        height: outerRef.current.offsetHeight
      });

      setInnerRect({
        top: innerRef.current.offsetTop + outerRef.current.clientTop,
        left: innerRef.current.offsetLeft + outerRef.current.clientLeft,
        width: innerRef.current.offsetWidth,
        height: innerRef.current.offsetHeight
      });
    }
  }, [position, isActive]);

  const handleWheel = (e) => {
    if (!outerRef.current || !innerRef.current) return;
    const outerHeight = outerRef.current.clientHeight;
    const innerHeight = innerRef.current.scrollHeight;
    
    if (innerHeight <= outerHeight) return;

    setScrollOffset((prev) => {
      let newOffset = prev + e.deltaY;
      const maxOffset = innerHeight - outerHeight;
      return Math.max(0, Math.min(newOffset, maxOffset));
    });
  };

  return (
    <>
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              closeWindow();
            }}
          >
            X
          </button>
        </div>
        <div 
          className="win-content" 
          ref={outerRef} 
          onWheel={handleWheel}
        >
          <div 
            className="win-inner-content" 
            ref={innerRef}
            style={{ transform: `translateY(-${scrollOffset}px)` }}
          >
            <WindowOverlayContext.Provider value={overlayTarget}>
              {content}
            </WindowOverlayContext.Provider>
          </div>
        </div>
      </div>

      {globalOverlayNode && windowRef.current && createPortal(
        <div style={{ position: 'absolute', left: position.x, top: position.y, zIndex: zIndex, width: windowRef.current.offsetWidth, height: windowRef.current.offsetHeight, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: contentRect.top, left: contentRect.left, width: contentRect.width, height: contentRect.height, overflow: 'hidden' }}>
            <div 
              ref={setOverlayTarget}
              style={{ transform: `translateY(-${scrollOffset}px)`, position: 'absolute', top: innerRect.top, left: innerRect.left, width: innerRect.width, height: innerRect.height, pointerEvents: 'none' }}
            ></div>
          </div>
        </div>,
        globalOverlayNode
      )}
    </>
  );
};

export default Window;

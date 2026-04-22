import { useState, useCallback, useEffect } from 'react';

const useDraggable = (id, initialPosition, updatePosition) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e) => {
    if (window.innerWidth <= 768) return;
    
    e.preventDefault();
    setIsDragging(true);
    setOffset({
      x: e.clientX - initialPosition.x,
      y: e.clientY - initialPosition.y,
    });
  }, [initialPosition]);

  const handlePointerMove = useCallback((e) => {
    if (isDragging) {
      let newX = e.clientX - offset.x;
      let newY = e.clientY - offset.y;
      
      // Clamp to viewport so the titlebar remains accessible
      newX = Math.max(-400, Math.min(newX, window.innerWidth - 100));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 40));
      
      updatePosition(id, newX, newY);
    }
  }, [isDragging, id, offset, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return { handlePointerDown };
};

export default useDraggable;

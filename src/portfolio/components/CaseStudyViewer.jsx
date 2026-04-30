import React, { useEffect, useRef, useState, useLayoutEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import STLViewer from './STLViewer';
import PLYViewer from './PLYViewer';
import { WindowOverlayContext } from '../contexts/OverlayContexts';

const HolePunchVideo = ({ block }) => {
  const overlayTarget = useContext(WindowOverlayContext);
  const placeholderRef = useRef(null);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (placeholderRef.current) {
      let top = 0;
      let left = 0;
      let current = placeholderRef.current;
      while (current && !current.classList.contains('win-inner-content')) {
        top += current.offsetTop;
        left += current.offsetLeft;
        current = current.offsetParent;
      }
      setRect({
        top,
        left,
        width: placeholderRef.current.offsetWidth,
        height: placeholderRef.current.offsetHeight
      });
    }
  }, [block]);

  return (
    <>
      <div 
        ref={placeholderRef} 
        style={{ width: '100%', aspectRatio: block.aspectRatio || '16/9', backgroundColor: 'transparent' }} 
      />
      {overlayTarget && rect && createPortal(
        <video 
          src={block.src} 
          controls 
          autoPlay
          muted
          loop
          crossOrigin="anonymous" 
          style={{ position: 'absolute', top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: 'auto', objectFit: 'contain' }} 
        />,
        overlayTarget
      )}
    </>
  );
};

const VideoBlock = ({ block, index, isActive }) => {
  const videoRef = useRef(null);
  const isIntersectingRef = useRef(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.5;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersectingRef.current = entry.isIntersecting;
          if (entry.isIntersecting && isActive) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive && isIntersectingRef.current) {
        videoRef.current.play().catch(() => {});
      } else if (!isActive) {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  return (
    <figure key={index} style={{ margin: 0, padding: '16px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
      <video ref={videoRef} src={block.src} loop playsInline muted={block.muted} style={{ width: '100%', height: 'auto', display: 'block', outline: 'none' }} />
      {block.caption && (
        <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};

const CaseStudyViewer = ({ title, subtitle, role, timeline, blocks, autoScroll, isActive }) => {
  const containerRef = useRef(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!autoScroll || !isActive || hasScrolledRef.current) return;

    let scrollInterval = null;

    const startDelay = setTimeout(() => {
      const target = containerRef.current?.closest('.win-content') || containerRef.current;
      if (!target) return;

      // Only auto-scroll if we haven't already
      hasScrolledRef.current = true;
      target.scrollTop = 0;

      scrollInterval = setInterval(() => {
        const { scrollTop, scrollHeight, clientHeight } = target;
        if (scrollTop + clientHeight < scrollHeight - 1) {
          target.scrollTop += 1;
        } else {
          clearInterval(scrollInterval);
          scrollInterval = null;
        }
      }, 30);
    }, 1200);

    return () => {
      clearTimeout(startDelay);
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [autoScroll, isActive]);

  // Reset the scroll flag when the component unmounts (window closes)
  useEffect(() => {
    return () => {
      hasScrolledRef.current = false;
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
      backgroundColor: '#ffffff',
      color: '#000000',
      padding: '24px',
      height: '100%',
      fontFamily: '"Times New Roman", Times, serif',
      lineHeight: '1.6'
    }}>
      <header style={{ marginBottom: '32px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#555', marginBottom: '4px', whiteSpace: 'pre-line' }}>{subtitle}</div>
        )}
        {(role || timeline) && (
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontFamily: 'monospace', color: '#555' }}>
            {role && <span><strong>Role:</strong> {role}</span>}
            {timeline && <span><strong>Timeline:</strong> {timeline}</span>}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '14px', fontFamily: 'monospace', color: '#555' }}>//</div>
      </header>

      <div className="case-study-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {(blocks || []).map((block, index) => {
          if (block.type === 'text') {
            return (
              <div key={index} style={{ fontSize: '16px' }}>
                {block.heading && <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>{block.heading}</h3>}
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{block.content}</p>
              </div>
            );
          } else if (block.type === 'image') {
            return (
              <figure key={index} style={{ margin: 0, padding: '16px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                <div 
                  style={{ 
                    backgroundImage: `url(${block.src})`, 
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '100%', 
                    height: '400px', 
                    display: 'block' 
                  }} 
                />
                {block.caption && (
                  <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          } else if (block.type === 'video') {
            return (
              <figure key={index} style={{ margin: 0, padding: '0 0 16px 0', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <HolePunchVideo block={block} />
                {block.caption && (
                  <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          } else if (block.type === 'stl' || block.type === 'ply' || block.type === 'iframe') {
            return (
              <figure key={index} style={{ margin: 0, padding: '16px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                <div style={{
                  width: '100%', 
                  aspectRatio: block.aspectRatio || '16/9', 
                  backgroundColor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #999',
                  fontFamily: 'monospace',
                  color: '#666',
                  textAlign: 'center',
                  padding: '16px',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <strong>[ Interactive Media Placeholder ]</strong>
                  <span>{block.type.toUpperCase()} content is disabled in the 3D monitor view.</span>
                  {block.src && <a href={block.src} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--os-navy)' }}>Open in new tab</a>}
                </div>
                {block.caption && (
                  <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default CaseStudyViewer;

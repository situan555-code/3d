import React, { useEffect, useRef } from 'react';
import STLViewer from './STLViewer';
import PLYViewer from './PLYViewer';

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
                <img src={block.src} alt={block.caption || 'Case Study Visual'} style={{ width: '100%', height: 'auto', display: 'block' }} />
                {block.caption && (
                  <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          } else if (block.type === 'video') {
            return <VideoBlock key={index} block={block} index={index} isActive={isActive} />;
          } else if (block.type === 'stl' || block.type === 'ply') {
            const isPLY = block.src.toLowerCase().endsWith('.ply');
            return (
              <figure key={index} style={{ margin: 0, padding: '16px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                {isActive ? (
                  isPLY ? (
                    <PLYViewer url={block.src} aspectRatio={block.aspectRatio || '4/3'} />
                  ) : (
                    <STLViewer url={block.src} aspectRatio={block.aspectRatio || '4/3'} />
                  )
                ) : (
                  <div style={{
                    width: '100%', 
                    aspectRatio: block.aspectRatio || '4/3', 
                    backgroundColor: '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed #999',
                    fontFamily: 'monospace',
                    color: '#666',
                    textAlign: 'center',
                    padding: '16px'
                  }}>
                    [3D Viewer Paused] <br/><br/> Focus this window to interact.
                  </div>
                )}
                {block.caption && (
                  <figcaption style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', color: '#666' }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          } else if (block.type === 'iframe') {
            return (
              <figure key={index} style={{ margin: 0, padding: '16px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                <iframe
                  src={block.src}
                  title={block.caption || 'Interactive embed'}
                  style={{ width: '100%', aspectRatio: block.aspectRatio || '4 / 3', border: 'none', display: 'block' }}
                  allow="accelerometer; gyroscope"
                />
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

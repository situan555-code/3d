import React from 'react';

const DesktopIcon = ({ id, title, position, onDoubleClick, isFolderItem, iconType = 'folder' }) => {
  return (
    <div
      className="desktop-icon"
      style={isFolderItem ? { width: '100%', alignItems: 'center' } : {}}
      onDoubleClick={onDoubleClick}
      onClick={(e) => {
        if (window.innerWidth <= 768) {
          onDoubleClick(e);
        }
      }}
      tabIndex="0"
    >
      <div className="desktop-icon-img-wrapper">
        <div className={`desktop-icon-img icon-${iconType}`}></div>
      </div>
      <div 
        className="desktop-icon-text" 
        style={isFolderItem ? { color: '#000000', textShadow: 'none', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '14px', width: '100%' } : {}}
      >
        {title}
      </div>
    </div>
  );
};

export default DesktopIcon;

import React from 'react';
import DesktopIcon from './DesktopIcon';

const FolderView = ({ folderId, windows = [], openWindow = () => {} }) => {
  // Find all windows mapped to this folder
  const items = windows.filter(w => w.folderId === folderId);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '16px',
      padding: '16px',
      width: '100%',
      minHeight: '200px',
      backgroundColor: '#ffffff'
    }}>
      {items.map((item) => (
        <DesktopIcon
          key={item.id}
          id={item.id}
          title={item.title}
          iconType={item.iconType}
          position={{ x: 'auto', y: 'auto' }} // CSS Grid overrides position
          onDoubleClick={() => openWindow(item.id)}
          isFolderItem={true}
        />
      ))}
      {items.length === 0 && <p style={{ color: '#888' }}>This folder is empty.</p>}
    </div>
  );
};

export default FolderView;

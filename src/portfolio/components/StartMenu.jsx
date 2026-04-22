import React from 'react';
import { fileSystem } from '../os/fileSystem';

const StartMenu = ({ openWindow, closeMenu, onEasterEggClick }) => {
  const launch = (id) => {
    openWindow(id);
    closeMenu();
  };

  return (
    <div className="start-menu bevel-outset">
      <div className="start-menu-brand">
        <span>Nautis OS 2026</span>
      </div>
      <div className="start-menu-items">
        {fileSystem.map(win => (
          <div key={win.id} className="start-menu-item" onClick={() => launch(win.id)}>
            <div className={`start-menu-icon icon-${win.iconType || 'document'}`} />
            <span>{win.title}</span>
          </div>
        ))}
        <div className="start-menu-divider" />
        <div className="start-menu-item" onClick={() => { onEasterEggClick(); closeMenu(); }}>
          <div className="start-menu-icon" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📎</div>
          <span>Clippy Assistant</span>
        </div>
        <div className="start-menu-divider" />
        <div className="start-menu-item" onClick={() => window.location.reload()}>
          <div className="start-menu-icon" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</div>
          <span>Shut Down...</span>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;

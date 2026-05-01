import React from 'react';

type Listener = () => void;

export const portalState = {
  portalNode: null as HTMLElement | null,
  overlayNode: null as HTMLElement | null,
  children: null as React.ReactNode | null,
  listeners: new Set<Listener>(),
  set(portal: HTMLElement | null, overlay: HTMLElement | null, children: React.ReactNode) {
    this.portalNode = portal;
    this.overlayNode = overlay;
    this.children = children;
    this.listeners.forEach(l => l());
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
};

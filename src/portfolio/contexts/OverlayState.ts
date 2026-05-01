import { createContext } from 'react';

// This context provides the root 1024x768 global overlay node created by WicgHitbox
export const GlobalOverlayContext = createContext<HTMLElement | null>(null);

// This context provides the specific window's internal scrolled content node created by Window.jsx
export const WindowOverlayContext = createContext<HTMLElement | null>(null);

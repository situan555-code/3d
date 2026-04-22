import React from 'react';
import Paint from '../components/Paint';
import CaseStudyViewer from '../components/CaseStudyViewer';
import { caseStudies } from '../data/caseStudies';

// This acts as the global file system / registry for the OS
// All items are desktop icons — no folders
export const fileSystem = [
  // --- Column 1 ---
  {
    id: 'about_me',
    title: 'About_Me.txt',
    onDesktop: true,
    iconType: 'person',
    content: <CaseStudyViewer {...caseStudies.about_me} autoScroll={true} />,
    position: { x: 20, y: 20 }
  },
  {
    id: 'mavin_50_years',
    title: '50th_Anniversary.txt',
    onDesktop: true,
    iconType: '50th',
    content: <CaseStudyViewer {...caseStudies.mavin_50_years} />,
    position: { x: 20, y: 130 }
  },
  {
    id: 'cgi_configurator',
    title: 'CGI.txt',
    onDesktop: true,
    iconType: 'cgi',
    content: <CaseStudyViewer {...caseStudies.cgi_configurator} />,
    position: { x: 20, y: 240 }
  },
  {
    id: 'retail_kiosk',
    title: 'Retail_Kiosk.txt',
    onDesktop: true,
    iconType: 'kiosk',
    content: <CaseStudyViewer {...caseStudies.retail_kiosk} />,
    position: { x: 20, y: 350 }
  },
  {
    id: 'virtual_tours',
    title: 'Virtual_Tours.txt',
    onDesktop: true,
    iconType: 'vr',
    content: <CaseStudyViewer {...caseStudies.virtual_tours} />,
    position: { x: 20, y: 460 }
  },
  {
    id: 'polymount_greenscreen',
    title: 'Polymount.txt',
    onDesktop: true,
    iconType: 'movie',
    content: <CaseStudyViewer {...caseStudies.polymount_greenscreen} />,
    position: { x: 20, y: 570 }
  },
  {
    id: 'isoshock',
    title: 'isoSHOCK.txt',
    onDesktop: true,
    iconType: 'crane',
    content: <CaseStudyViewer {...caseStudies.isoshock} />,
    position: { x: 20, y: 680 }
  },

  // --- Column 2 ---
  {
    id: 'prototype_app',
    title: '2026.txt',
    onDesktop: true,
    iconType: 'iphone',
    content: <CaseStudyViewer {...caseStudies.prototype_app} />,
    position: { x: 140, y: 20 }
  },
  {
    id: 'product_photography',
    title: 'Product_Photos.txt',
    onDesktop: true,
    iconType: 'studiolight',
    content: <CaseStudyViewer {...caseStudies.product_photography} />,
    position: { x: 140, y: 130 }
  },
  {
    id: 'lifestyle_photography',
    title: 'Lifestyle_Photos.txt',
    onDesktop: true,
    iconType: 'photo',
    content: <CaseStudyViewer {...caseStudies.lifestyle_photography} />,
    position: { x: 140, y: 240 }
  },
  {
    id: 'portfolio_assets',
    title: 'distroBLOX.txt',
    onDesktop: true,
    iconType: 'speaker',
    content: <CaseStudyViewer {...caseStudies.portfolio_assets} />,
    position: { x: 140, y: 350 }
  },
  {
    id: 'paint',
    title: 'Paint.exe',
    onDesktop: true,
    iconType: 'paint',
    content: <Paint />,
    position: { x: 140, y: 460 }
  },
  {
    id: 'linkedin',
    title: 'LinkedIn.url',
    onDesktop: true,
    iconType: 'linkedin',
    content: (
      <div style={{ padding: '16px', fontFamily: 'monospace' }}>
        <h2>LinkedIn Profile</h2>
        <p><a href="https://www.linkedin.com/in/nautis555" target="_blank" rel="noopener noreferrer">Open LinkedIn →</a></p>
      </div>
    ),
    position: { x: 140, y: 570 }
  }
];

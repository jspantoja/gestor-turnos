// Estilos Globales de la Aplicación
const GlobalStyles = ({ accentColor, glassIntensity, reducedMotion, settings = {} }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&family=SF+Pro+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    
    /* ===================================
       LIGHT MODE THEME VARIABLES
    =================================== */
    :root {
      /* Background & Text Colors */
      --bg-body: ${settings.bgColor || '#f5f5f7'};
      --text-primary: #1d1d1f;
      --text-secondary: #6e6e73;
      --text-tertiary: #86868b;
      
      /* Glass System Variables - Direct Mapping (0 = solid, 100 = glassy) */
      --glass-intensity: ${glassIntensity !== undefined ? glassIntensity : 50};
      
      /* Opacity: 0.98 (solid) → 0.20 (glassy) - Maximum transparency for crystal effect */
      --glass-opacity: calc(0.98 - (var(--glass-intensity) / 100) * 0.78);
      
      /* Blur: 0px (solid) → 50px (glassy) - More blur for better distortion */
      --glass-blur: calc((var(--glass-intensity) / 100) * 50px);
      
      /* Saturation: 100% (solid) → 200% (glassy) - more vivid colors when glassy */
      --glass-saturation: calc(100% + (var(--glass-intensity) / 100) * 100%);
      
      /* Component Colors */
      --glass-panel: rgba(255, 255, 255, 0.65);
      --glass-border: rgba(0, 0, 0, 0.08);
      --card-bg: rgba(255, 255, 255, 1);
      --input-bg: rgba(255, 255, 255, 0.34);
      
      /* Accent Colors */
      --accent-solid: ${accentColor || '#007aff'};
      --accent-text: #ffffff;
      
      /* Status Colors */
      --sunday-bg: rgba(255, 58, 48, 0.32);
      --today-highlight: rgba(0, 122, 255, 0.08);
      --reliever-badge: #FF9500;
      --success-soft: #d1fae5;
      --success-text: #065f46;
      --warning-soft: #fef3c7;
      --warning-text: #92400e;
      
      /* Modal Overlay */
      --modal-overlay: rgba(255, 255, 255, 0.39);
      --modal-overlay-blur: calc(6px + (var(--glass-intensity) / 100) * 14px); /* Desenfoque dinámico (6px a 20px) */
      
      /* Blur Settings */
      --blur-val: 20px;
      --saturate-val: 2; /* 200% Saturation */
    }

    /* ===================================
       DARK MODE THEME VARIABLES
    =================================== */
    [data-theme='dark'] {
      /* Background & Text Colors - Better Contrast */
      /* IGNORE settings.bgColor in dark mode to prevent white background */
      --bg-body: #1a1a1e;
      --text-primary: #f5f5f7;
      --text-secondary: #a1a1a6;
      --text-tertiary: #6e6e73;
      
      /* Component Colors - Lighter for Better Visibility */
      --glass-panel: rgba(42, 42, 48, 0.90);
      --glass-border: rgba(255, 255, 255, 0.2);
      --card-bg: rgba(42, 42, 48, 0.95);
      --input-bg: rgba(70, 70, 78, 0.8);
      
      /* Accent Colors - Adjusted for Dark */
      --accent-solid: ${accentColor === '#000000' ? '#ffffff' : (accentColor || '#0a84ff')};
      --accent-text: ${accentColor === '#000000' ? '#000000' : '#ffffff'};
      
      /* Status Colors - Dark Variants */
      --sunday-bg: rgba(255, 69, 58, 0.15);
      --today-highlight: rgba(10, 132, 255, 0.12);
      --reliever-badge: #FF9F0A;
      --success-soft: rgba(16, 185, 129, 0.2);
      --success-text: #d1fae5;
      --warning-soft: rgba(245, 158, 11, 0.2);
      --warning-text: #fef3c7;
      
      /* Modal Overlay - Darker for Better Contrast */
      --modal-overlay: rgba(0, 0, 0, 0.37);
      /* No es necesario redefinir --modal-overlay-blur, heredará el cálculo */
      
      /* Blur Settings */
      --blur-val: 20px;
      --saturate-val: 1.5;
    }

    /* ===================================
       BASE STYLES
    =================================== */
    body {
      font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-body);
      color: var(--text-primary);
      margin: 0;
      padding: 0;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 0.4s ease, color 0.4s ease;
    }

    /* ===================================
       CUSTOM SCROLLBAR
    =================================== */
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: var(--glass-border);
      background-clip: padding-box;
      border: 3px solid transparent;
      border-radius: 99px;
      transition: background 0.2s ease;
    }
    ::-webkit-scrollbar-thumb:active { background: var(--text-secondary); border-width: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); border: 3px solid transparent; background-clip: padding-box; }
    ::-webkit-scrollbar-corner { background: transparent; }

    /* ===================================
       GLOBAL FOCUS STATES (Accessibility)
    =================================== */
    *:focus {
      outline: none;
    }
    
    *:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--accent-solid), 0 0 0 5px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    button:focus-visible,
    a:focus-visible {
      box-shadow: 0 0 0 3px var(--accent-solid);
    }

    /* Fix Dark Mode Form Elements */
    input, select, textarea {
      color: var(--text-primary) !important;
    }
    
    option {
      background-color: var(--bg-body);
      color: var(--text-primary);
    }

    /* ===================================
       BACKGROUND BLOBS
    =================================== */
    .blob-cont {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      overflow: hidden;
      background: var(--bg-body);
      pointer-events: none;
    }
    
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.4;
      will-change: transform;
    }

    /* ===================================
       GLASS PANEL - For settings cards and other non-modal elements
    =================================== */
    .glass-panel {
      background: var(--glass-panel);
      backdrop-filter: blur(var(--blur-val)) saturate(var(--saturate-val)) brightness(1.05);
      -webkit-backdrop-filter: blur(var(--blur-val)) saturate(var(--saturate-val)) brightness(1.05);
      border: 1px solid var(--glass-border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.07), 0 1px 1px rgba(0, 0, 0, 0.02);
    }

    /* ===================================
       UNIFIED GLASS SYSTEM - Light Mode
       Based on Apple Liquid Glass principles
    =================================== */
    
    /* Base Glass Surface - More opaque for better readability */
    /* Dock-specific glass with gradient tint for visibility on light backgrounds */
    .dock-menu, .liquid-glass, .card-glass {
      position: relative;
      
      /* Subtle gradient from white to light gray for visibility over light backgrounds */
    
      
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(1.05);
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(1.05);
      
      border: 1px solid rgba(255, 255, 255, 0.5);
      
      /* Softer shadows matching liquid-glass */
      box-shadow: 
        0 20px 40px -10px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        inset 0 -1px 0 rgba(0, 0, 0, 0.03);
      
      will-change: backdrop-filter;
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      overflow: hidden;
    }

    /* ===================================
       UNIFIED GLASS SYSTEM - Dark Mode
    =================================== */
    [data-theme='dark'] .dock-menu, [data-theme='dark'] .liquid-glass, [data-theme='dark'] .card-glass {
      backdrop-filter: blur(var(--glass-blur)) saturate(150%) brightness(0.95);
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%) brightness(0.95);
      
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    /* ===================================
       DAY CARDS - PSEUDO GLASS (COMPACT)
    =================================== */
    .day-card {
      /* Gradient Background - No Backdrop Filter */
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.78) 100%);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
      
      /* Transitions */
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    /* Glass Reflection Layer */
    .day-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 40%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
      pointer-events: none;
      border-radius: 12px 12px 0 0;
    }

    .day-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }

    /* Day Cards - Dark Mode */
    [data-theme='dark'] .day-card {
      background: linear-gradient(135deg, rgba(52, 52, 58, 0.92) 0%, rgba(48, 48, 54, 0.88) 100%);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    [data-theme='dark'] .day-card::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent);
    }

    /* ===================================
       DOCK STYLES
    =================================== */
    .dock-container {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      width: auto;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    }

    /* Scrim Layer for Legibility */
    .dock-container::before {
      content: '';
      position: absolute;
      inset: -100px;
      background: radial-gradient(circle at bottom, rgba(0, 0, 0, 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: -1;
    }

    [data-theme='dark'] .dock-container::before {
      background: radial-gradient(circle at bottom, rgba(0, 0, 0, 0.3) 0%, transparent 70%);
    }

    /* Hides dock on mobile when a modal is open */
    @media (max-width: 640px) {
      .dock-container.dock-hidden {
        transform: translateX(-50%) translateY(120%);
        opacity: 0;
        pointer-events: none;
      }
    }

    /* Dock Menu - Layout Only (Glass from unified system above) */
    .dock-menu {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 24px;
      border-radius: 32px;
    }

    /* Dock Buttons */
    .dock-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border-radius: 16px;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      background: transparent;
      border: none;
      cursor: pointer;
      position: relative;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    [data-theme='dark'] .dock-button {
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .dock-button:hover {
      background: rgba(0, 0, 0, 0.06);
      transform: translateY(-3px) scale(1.05);
    }
    
    .dock-button:active {
      transform: translateY(0) scale(0.95);
    }

    [data-theme='dark'] .dock-button:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .dock-button.active {
      background: var(--accent-solid);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transform: translateY(-2px);
    }
    
    /* Active indicator dot */
    .dock-button.active::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 5px;
      height: 5px;
      background: var(--accent-solid);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-solid);
    }

    .dock-button.active .dock-icon {
      color: var(--accent-text);
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    .dock-button:not(.active) .dock-icon {
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    
    .dock-button:not(.active):hover .dock-icon {
      color: var(--text-primary);
    }

    /* ===================================
       FORM INPUTS
    =================================== */
    .glass-input {
      background: var(--input-bg);
      border: 1.5px solid var(--glass-border);
      outline: none;
      color: var(--text-primary);
      border-radius: 12px;
      transition: all 0.25s ease;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      font-size: 14px;
    }
    
    .glass-input::placeholder {
      color: var(--text-tertiary);
    }

    .glass-input:focus {
      background: var(--card-bg);
      border-color: var(--accent-solid);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 20%, transparent);
    }
    
    .glass-input:hover:not(:focus) {
      border-color: var(--text-tertiary);
    }

    /* ===================================
       CUSTOM COMPONENT STYLES
    =================================== */
    .shift-btn-active {
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent-solid) 15%, transparent), color-mix(in srgb, var(--accent-solid) 10%, transparent));
      color: var(--text-primary);
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    [data-theme='dark'] .shift-btn-active {
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent-solid) 30%, transparent), color-mix(in srgb, var(--accent-solid) 15%, transparent));
      color: var(--text-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* ===================================
       UTILITY CLASSES
    =================================== */
    .reliever-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--reliever-badge);
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .today-highlight {
      background: var(--today-highlight);
      border-color: var(--accent-solid);
      box-shadow: 0 0 0 2px var(--accent-solid);
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }

    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* ===================================
       PAYROLL TABLE SCROLL
    =================================== */
    .payroll-scroll-container {
      position: relative;
    }

    .payroll-table-scroll {
      overflow-x: auto;
      overflow-y: visible;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }

    .payroll-table-scroll::-webkit-scrollbar {
      height: 8px;
    }

    .payroll-table-scroll::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }

    .payroll-table-scroll::-webkit-scrollbar-thumb {
      background: var(--glass-border);
      border-radius: 4px;
      transition: background 0.2s;
    }

    .payroll-table-scroll::-webkit-scrollbar-thumb:hover {
      background: var(--text-tertiary);
    }

    .payroll-scroll-container::before,
    .payroll-scroll-container::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 8px;
      width: 40px;
      pointer-events: none;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .payroll-scroll-container::before {
      left: 0;
      background: linear-gradient(to right, var(--bg-body), transparent);
    }

    .payroll-scroll-container::after {
      right: 0;
      background: linear-gradient(to left, var(--bg-body), transparent);
    }

    .payroll-scroll-container.show-left-shadow::before {
      opacity: 0.3;
    }

    .payroll-scroll-container.show-right-shadow::after {
      opacity: 0.3;
    }

    .report-sticky-col {
      position: sticky;
      left: 0;
      background: var(--glass-panel);
      z-index: 5;
      box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
    }

    [data-theme='dark'] .report-sticky-col {
      box-shadow: 2px 0 4px rgba(0, 0, 0, 0.3);
    }

    .scroll-hint {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      background: var(--accent-solid);
      color: var(--accent-text);
      padding: 8px 12px;
      border-radius: 99px 0 0 99px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: bold;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
      z-index: 8;
      pointer-events: none;
    }

    @media (min-width: 768px) {
      .scroll-hint {
        display: none;
      }
    }

    /* ===================================
       MODAL ANIMATIONS (Safe with backdrop-filter)
    =================================== */
    
    /* Overlay Fade */
    @keyframes overlayFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes overlayFadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    /* Modal Entrance (Scale + Fade, no translate for backdrop-filter safety) */
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: scale(0.95) translateZ(0);
      }
      to {
        opacity: 1;
        transform: scale(1) translateZ(0);
      }
    }

    @keyframes modalSlideDown {
      from {
        opacity: 1;
        transform: scale(1) translateZ(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateZ(0);
      }
    }

    /* Mobile Bottom Sheet Slide */
    @keyframes mobileSlideUp {
      from {
        opacity: 0;
        transform: translateY(100%) translateZ(0);
      }
      to {
        opacity: 1;
        transform: translateY(0) translateZ(0);
      }
    }

    @keyframes mobileSlideDown {
      from {
        opacity: 1;
        transform: translateY(0) translateZ(0);
      }
      to {
        opacity: 0;
        transform: translateY(100%) translateZ(0);
      }
    }

    /* Apply animations */
    .modal-overlay-enter {
      animation: overlayFadeIn 0.2s ease-out forwards;
    }

    .modal-overlay-exit {
      animation: overlayFadeOut 0.2s ease-out forwards;
    }

    .modal-enter {
      animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .modal-exit {
      animation: modalSlideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* Mobile specific */
    @media (max-width: 640px) {
      .modal-enter {
        animation: mobileSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      .modal-exit {
        animation: mobileSlideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
    }

    /* ===================================
       MODAL OVERLAY (Fondo de modales)
    =================================== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      justify-content: center;
      background-color: var(--modal-overlay);
      backdrop-filter: blur(var(--modal-overlay-blur)) saturate(120%);
      -webkit-backdrop-filter: blur(var(--modal-overlay-blur)) saturate(120%);
    }
    /* ===================================
       PAGE TRANSITION ANIMATIONS
    =================================== */
    
    /* Fade + Slide Up for page content */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.98);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    /* Success bounce animation */
    @keyframes successBounce {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }
    
    /* Shake animation for errors */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-5px); }
      40%, 80% { transform: translateX(5px); }
    }
    
    .animate-enter {
      animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .animate-fadeIn {
      animation: fadeInScale 0.3s ease-out forwards;
    }
    
    .animate-success {
      animation: successBounce 0.4s ease-out;
    }
    
    .animate-shake {
      animation: shake 0.4s ease-out;
    }
    
    /* Staggered children animation */
    .stagger-children > * {
      opacity: 0;
      animation: fadeInUp 0.4s ease-out forwards;
    }
    
    .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
    .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
    .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
    .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
    .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
    .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
    .stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
    .stagger-children > *:nth-child(8) { animation-delay: 0.4s; }
    
    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Toast Animations */
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes slideOutDown {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
    }
    
    .animate-slideInUp {
      animation: slideInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    .animate-slideOutDown {
      animation: slideOutDown 0.2s ease-out forwards;
    }

    /* ===================================
       PRINT STYLES
    =================================== */
    @media print {
      body {
        overflow: visible !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Hide Non-Printable Elements */
      .no-print, 
      .dock-container, 
      .dock-menu,
      .scroll-hint, 
      .blob-cont,
      button,
      .print-hidden {
        display: none !important;
      }

      /* Force Table Visibility */
      .payroll-table-scroll,
      .payroll-scroll-container,
      .overflow-auto,
      .flex-1 {
        overflow: visible !important;
        height: auto !important;
        display: block !important;
      }

      /* Clean Content Layout */
      .glass-panel,
      .bg-\[var\(--bg-body\)\],
      .bg-\[var\(--glass-dock\)\],
      .bg-\[var\(--glass-border\)\] {
        background: white !important;
        border: none !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
      }

      /* Table Specifics */
      .report-table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      
      .report-table th, 
      .report-table td {
        border: 1px solid #ddd !important;
        color: black !important;
        page-break-inside: avoid;
      }

      .report-sticky-col {
        position: static !important;
        box-shadow: none !important;
      }

      /* Hide Gradients/Shadows */
      .payroll-scroll-container::before, 
      .payroll-scroll-container::after {
        display: none !important;
      }

      /* Layout Resets */
      .fixed, .sticky {
        position: static !important;
      }

      /* Ensure Custom Message is visible */
      .print-visible {
        display: block !important;
      }

      /* Remove margins/padding that waste space */
      .p-6, .py-8, .pb-32 {
        padding: 0 !important;
        margin: 0 !important;
      }
      
      /* Improve font size for print */
      * {
        font-size: 10pt !important;
      }
      
      h3, h2 {
        font-size: 14pt !important;
      }
    }
  `}</style>
);

export default GlobalStyles;

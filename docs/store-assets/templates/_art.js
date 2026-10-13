// Shared SVG pieces (chalkboard, red pen, books) used by icon.html and feature.html.
window.MTL_ART = {
  defs: `
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#92400e"/></linearGradient>
      <radialGradient id="board" cx="0.35" cy="0.25" r="0.9"><stop offset="0" stop-color="#3a7360"/><stop offset="1" stop-color="#1c3a30"/></radialGradient>
      <linearGradient id="penBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a85"/><stop offset="0.45" stop-color="#ef3b4d"/><stop offset="1" stop-color="#b3132a"/></linearGradient>
      <linearGradient id="penBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff1a8"/><stop offset="0.5" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></linearGradient>
      <linearGradient id="penTip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6e5"/><stop offset="1" stop-color="#e8c9a0"/></linearGradient>
      <filter id="drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#7c2d12" flood-opacity="0.45"/></filter>
      <filter id="dropSm" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#7c2d12" flood-opacity="0.4"/></filter>
    </defs>`,
  // Chalkboard 320x240 at origin
  board: (text = 'A+') => `
    <g filter="url(#drop)">
      <rect x="0" y="0" width="320" height="240" rx="30" fill="url(#wood)"/>
      <rect x="6" y="4" width="308" height="14" rx="7" fill="#fbbf24" opacity="0.35"/>
      <rect x="20" y="20" width="280" height="190" rx="18" fill="url(#board)"/>
      <rect x="20" y="20" width="280" height="190" rx="18" fill="none" stroke="#0f241d" stroke-width="4" opacity="0.5"/>
      <text x="160" y="152" text-anchor="middle" font-family="Patrick Hand" font-size="140" fill="#f8fafc" opacity="0.95">${text}</text>
      <path d="M58 64 l8 16 l17 2 l-13 11 l4 17 l-16 -9 l-15 9 l4 -17 l-13 -11 l17 -2 z" fill="#fde047" opacity="0.9"/>
      <path d="M232 170 q24 -18 48 -2" stroke="#f8fafc" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>
      <rect x="40" y="214" width="240" height="16" rx="8" fill="#78350f"/>
      <rect x="70" y="208" width="40" height="10" rx="4" fill="#f8fafc"/>
      <rect x="122" y="209" width="26" height="9" rx="4" fill="#fde047"/>
    </g>`,
  // Red pen pointing down-left, ~300 long, origin at nib
  pen: `
    <g filter="url(#drop)">
      <rect x="40" y="-22" width="230" height="44" rx="20" fill="url(#penBody)"/>
      <rect x="52" y="-17" width="200" height="9" rx="4.5" fill="#fff" opacity="0.45"/>
      <rect x="226" y="-24" width="26" height="48" rx="6" fill="url(#penBand)"/>
      <rect x="268" y="-18" width="26" height="36" rx="14" fill="#9f1239"/>
      <path d="M42 -20 L0 0 L42 20 Z" fill="url(#penTip)"/>
      <path d="M14 -7 L0 0 L14 7 Z" fill="#9f1239"/>
    </g>`,
  // Stack of 3 books, 180 wide
  books: `
    <g filter="url(#dropSm)">
      <rect x="0" y="80" width="180" height="40" rx="8" fill="#3b82f6"/><rect x="10" y="88" width="160" height="6" rx="3" fill="#fff" opacity="0.5"/><rect x="150" y="80" width="12" height="40" fill="#1e40af"/>
      <rect x="14" y="40" width="160" height="40" rx="8" fill="#22c55e"/><rect x="24" y="48" width="140" height="6" rx="3" fill="#fff" opacity="0.5"/><rect x="28" y="40" width="12" height="40" fill="#15803d"/>
      <rect x="4" y="0" width="166" height="40" rx="8" fill="#a855f7"/><rect x="14" y="8" width="146" height="6" rx="3" fill="#fff" opacity="0.5"/><rect x="140" y="0" width="12" height="40" fill="#7e22ce"/>
    </g>`,
};

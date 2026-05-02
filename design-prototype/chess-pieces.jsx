// Chess piece SVG components — 3 styles: 'flat', 'classic', 'minimal'
// Global: window.PIECE_STYLE = 'flat' | 'classic' | 'minimal'

// ── Style: FLAT (geometric, clean) ───────────────────────────────────────────
const pieceFlat = {
  K: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="8"  y="34" width="24" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="10" y="30" width="20" height="5" rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M13 30 C12 24 10 22 10 18 C10 14 14 11 20 11 C26 11 30 14 30 18 C30 22 28 24 27 30Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="18.5" y="4"  width="3"  height="10" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="15"   y="6.5" width="10" height="3"  rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="11" y1="22" x2="29" y2="22" stroke={detail} strokeWidth="1" opacity=".55"/>
    </svg>
  ),
  Q: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7"  y="34" width="26" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="9"  y="30" width="22" height="5" rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M11 30 L8 14 L14 20 L20 7 L26 20 L32 14 L29 30 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="8"  cy="13" r="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="6"  r="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="32" cy="13" r="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="10" y1="26" x2="30" y2="26" stroke={detail} strokeWidth="1" opacity=".45"/>
    </svg>
  ),
  R: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7"    y="34" width="26" height="4"  rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="9"    y="30" width="22" height="5"  rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="11"   y="16" width="18" height="15" rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="10"   y="8"  width="5"  height="9"  rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="17.5" y="8"  width="5"  height="9"  rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="25"   y="8"  width="5"  height="9"  rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="11" y1="24" x2="29" y2="24" stroke={detail} strokeWidth="1" opacity=".45"/>
    </svg>
  ),
  B: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="8"  y="34" width="24" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="10" y="30" width="20" height="5" rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M14 30 C12 26 10 22 12 17 C14 12 17 9 20 8 C23 9 26 12 28 17 C30 22 28 26 26 30 Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="6.5" r="3" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="16" y1="20" x2="24" y2="14" stroke={detail} strokeWidth="1.2" strokeLinecap="round" opacity=".55"/>
    </svg>
  ),
  N: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      {/* Base */}
      <rect x="8" y="39" width="29" height="3" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="10" y="35" width="25" height="5" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Knight body — classic Staunton silhouette, single path */}
      <path
        d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      {/* Head */}
      <path
        d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      {/* Mouth */}
      <path d="M 9.5,25.5 A 0.5,0.5 0 1 1 8.5,25.5 A 0.5,0.5 0 1 1 9.5,25.5 Z" fill={detail}/>
      {/* Ear/mane detail */}
      <path d="M 15,15.5 A 0.5,1.5 0 1 1 14,15.5 A 0.5,1.5 0 1 1 15,15.5 Z" fill={detail} transform="rotate(30,14,15.5)"/>
      {/* Belt line */}
      <path d="M 24,35 L 10,35" stroke={detail} strokeWidth="1" opacity=".4" strokeLinecap="round"/>
    </svg>
  ),
  P: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="9"  y="34" width="22" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="11" y="30" width="18" height="5" rx="1" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M16 30 C15 27 14 25 14 23 C14 19 16 17 18 16 L22 16 C24 17 26 19 26 23 C26 25 25 27 24 30 Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="12" r="6" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
};

// ── Style: CLASSIC (round, softer Staunton-ish) ───────────────────────────────
const pieceClassic = {
  K: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="33" width="21" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M15 33 C13 27 11 24 12 19 C13 13 17 10 22.5 10 C28 10 32 13 33 19 C34 24 32 27 30 33Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="21" y="3"  width="3" height="11" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="17" y="6"  width="11" height="3"  rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <ellipse cx="22.5" cy="23" rx="8" ry="2" fill="none" stroke={detail} strokeWidth="1" opacity=".4"/>
    </svg>
  ),
  Q: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="33" width="21" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M13 33 C11 27 7 16 10 12 L16 19 L22.5 6 L29 19 L35 12 C38 16 34 27 32 33Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="7"    cy="10" r="3" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="22.5" cy="5"  r="3" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="38"   cy="10" r="3" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="13" y1="28" x2="32" y2="28" stroke={detail} strokeWidth="1" opacity=".4"/>
    </svg>
  ),
  R: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="33" width="21" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="13" y="16" width="19" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="8"  width="5"  height="10" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="20" y="8"  width="5"  height="10" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="28" y="8"  width="5"  height="10" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="13" y1="26" x2="32" y2="26" stroke={detail} strokeWidth="1" opacity=".4"/>
    </svg>
  ),
  B: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="33" width="21" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M16 33 C13 27 11 22 13 16 C15 10 18 7 22.5 6 C27 7 30 10 32 16 C34 22 32 27 29 33Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="22.5" cy="4.5" r="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="22.5" cy="15" r="2" fill={detail} opacity=".6"/>
    </svg>
  ),
  N: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="12" y="33" width="21" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M13 33 C13 28 10 24 10 19 C10 13 13 9 17 7 C19 6 21 5 23 5 C25 4 28 5 30 8 C31 11 31 14 29 16 C31 18 32 21 31 24 C30 28 27 30 25 32 L24 33 Z"
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M17 7 C16 11 13 16 13 20" stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none" opacity=".3"/>
      <path d="M23 5 L21 2 L25 4 Z" fill={stroke} opacity=".6"/>
      <circle cx="27" cy="10" r="2.5" fill={detail}/>
      <ellipse cx="30.5" cy="16.5" rx="1.3" ry="1" fill={detail} opacity=".6"/>
    </svg>
  ),
  P: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 45 45" fill="none" style={{width:'100%',height:'100%'}}>
      <ellipse cx="22.5" cy="37" rx="13" ry="3.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="13" y="33" width="19" height="5" rx="2.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M17 33 C16 29 15 26 15 24 C15 19 17 17 19.5 16 L25.5 16 C28 17 30 19 30 24 C30 26 29 29 28 33Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="22.5" cy="11.5" r="6.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
};

// ── Style: MINIMAL (ultra-simple, symbolic) ───────────────────────────────────
const pieceMinimal = {
  K: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      {/* Crown */}
      <polygon points="12,30 12,14 16,20 20,10 24,20 28,14 28,30" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      {/* Cross top */}
      <rect x="18.5" y="4" width="3" height="8" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="15.5" y="6.5" width="9" height="3" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  Q: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      <path d="M10 32 L7 12 L14 19 L20 6 L26 19 L33 12 L30 32 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <circle cx="7"  cy="11" r="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="5"  r="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="33" cy="11" r="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  R: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      <rect x="9" y="18" width="22" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="9"  y="8" width="6"  height="12" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="17" y="8" width="6"  height="12" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="25" y="8" width="6"  height="12" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  B: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      <ellipse cx="20" cy="28" rx="10" ry="5" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M14 28 C14 20 17 12 20 8 C23 12 26 20 26 28Z" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="7" r="3" fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Slash */}
      <line x1="17" y1="21" x2="23" y2="15" stroke={detail} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
    </svg>
  ),
  N: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      <path d="M10 34 C10 29 8 25 8 20 C8 14 11 9 15 7 C17 6 19 5 21 5 C23 4 26 5 27 8 C28 10 28 13 26 15 C28 16 29 19 28 22 C27 26 24 28 22 30 L21 34 Z"
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M21 5 L19 2 L23 4 Z" fill={stroke} opacity=".65"/>
      <circle cx="24" cy="10" r="2" fill={detail}/>
    </svg>
  ),
  P: (fill, stroke, detail, sw) => (
    <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
      <rect x="7" y="35" width="26" height="3" rx="1.5" fill={stroke} opacity=".7"/>
      <ellipse cx="20" cy="30" rx="9" ry="4" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <rect x="18" y="20" width="4" height="12" rx="2" fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx="20" cy="14" r="6" fill={fill} stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
};

const PIECE_STYLES = { flat: pieceFlat, classic: pieceClassic, minimal: pieceMinimal };

// Global style state — can be changed from outside
window.PIECE_STYLE = window.PIECE_STYLE || 'flat';

const ChessPiece = ({ type, color, size = 40, pieceStyle }) => {
  const style = pieceStyle || window.PIECE_STYLE || 'flat';
  const set = PIECE_STYLES[style] || pieceFlat;
  const isW = color === 'w';
  const fill   = isW ? '#eee8d5' : '#2c2316';
  const stroke = isW ? '#a07830' : '#6a5030';
  const detail = isW ? '#a07830' : '#c8a870';
  const sw = 1.4;

  const fn = set[type.toUpperCase()];
  if (!fn) return null;
  return (
    <div style={{ width: size, height: size, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {fn(fill, stroke, detail, sw)}
    </div>
  );
};

Object.assign(window, { ChessPiece, PIECE_STYLES });

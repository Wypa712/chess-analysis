// Chess Board Component with wooden texture and dark-green theme

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = [8,7,6,5,4,3,2,1];

// Parse FEN string to board array
function parseFEN(fen) {
  const rows = fen.split(' ')[0].split('/');
  const board = [];
  for (const row of rows) {
    const rank = [];
    for (const ch of row) {
      if (isNaN(ch)) {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        rank.push({ type: ch.toUpperCase(), color });
      } else {
        for (let i = 0; i < parseInt(ch); i++) rank.push(null);
      }
    }
    board.push(rank);
  }
  return board;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const ChessBoard = ({ fen = STARTING_FEN, flipped = false, highlightSquares = [], lastMove = null, selectedSquare = null, size = 480, pieceStyle = 'flat' }) => {
  const board = parseFEN(fen);
  const squareSize = size / 8;

  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

  const isHighlighted = (file, rank) => highlightSquares.includes(`${file}${rank}`);
  const isLastMove = (fi, ri) => lastMove && (lastMove.from === `${FILES[fi]}${RANKS[ri]}` || lastMove.to === `${FILES[fi]}${RANKS[ri]}`);

  const getLightSquareColor = () => '#f0d9b5';
  const getDarkSquareColor = () => '#b58863';
  const getLightHighlight = () => 'rgba(100,200,80,0.45)';
  const getDarkHighlight = () => 'rgba(100,200,80,0.55)';
  const getLastMoveLight = () => 'rgba(250,220,80,0.45)';
  const getLastMoveDark = () => 'rgba(250,220,80,0.55)';

  return (
    <div style={{
      display: 'inline-block',
      borderRadius: 4,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 3px #5a3a1a, 0 0 0 5px #3d2510, 0 0 0 8px #1a0f05',
      position: 'relative',
    }}>
      {/* Wooden frame effect */}
      <div style={{
        padding: 28,
        background: `
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px,
            transparent 1px, transparent 18px
          ),
          linear-gradient(165deg, #8B5A2B 0%, #6B3F1A 25%, #8B5A2B 50%, #5c3414 75%, #7a4920 100%)
        `,
        boxShadow: 'inset 0 2px 4px rgba(255,200,100,0.15), inset 0 -2px 4px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ranks.map((rank, ri) => (
            <div key={rank} style={{ display: 'flex' }}>
              {/* Rank label */}
              <div style={{
                width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#c9945a', fontFamily: "'DM Mono', monospace", fontWeight: 600,
                marginRight: 4,
              }}>{rank}</div>
              {files.map((file, fi) => {
                const isLight = (ri + fi) % 2 === 0;
                const piece = board[ri] ? board[ri][fi] : null;
                let bg = isLight ? getLightSquareColor() : getDarkSquareColor();
                let overlay = null;
                const squareId = `${file}${rank}`;
                if (isLastMove(fi, ri)) overlay = isLight ? getLastMoveLight() : getLastMoveDark();
                if (isHighlighted(file, rank)) overlay = isLight ? getLightHighlight() : getDarkHighlight();
                if (selectedSquare === squareId) overlay = 'rgba(80,160,255,0.5)';

                return (
                  <div key={file} style={{
                    width: squareSize, height: squareSize,
                    background: bg,
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'filter 0.1s',
                  }}>
                    {/* Wooden grain overlay on light squares */}
                    {isLight && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'repeating-linear-gradient(105deg, transparent 0px, transparent 6px, rgba(180,120,60,0.08) 6px, rgba(180,120,60,0.08) 7px)',
                        pointerEvents: 'none',
                      }} />
                    )}
                    {overlay && (
                      <div style={{ position: 'absolute', inset: 0, background: overlay, pointerEvents: 'none', zIndex: 1 }} />
                    )}
                    {piece && (
                      <div style={{ position: 'relative', zIndex: 2, width: squareSize * 0.82, height: squareSize * 0.82, filter: piece.color === 'w' ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }}>
                        <ChessPiece type={piece.type} color={piece.color} size={squareSize * 0.82} pieceStyle={pieceStyle}/>
                      </div>
                    )}
                    {/* File label on last rank */}
                    {ri === 7 && (
                      <div style={{
                        position: 'absolute', bottom: 2, right: 3,
                        fontSize: 10, color: isLight ? getDarkSquareColor() : getLightSquareColor(),
                        fontFamily: "'DM Mono', monospace", fontWeight: 600, lineHeight: 1,
                        opacity: 0.8,
                      }}>{file}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ChessBoard, parseFEN, STARTING_FEN, FILES, RANKS });

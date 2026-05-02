# Claude Design Prototype

Ця папка містить автономний дизайн-прототип Chess Analysis App.

## Як дивитись

Відкрити у браузері:

```text
Chess Analysis App.html
```

Файл використовує локальні JSX-файли з цієї ж папки:

```text
chess-board.jsx
chess-pieces.jsx
tweaks-panel.jsx
```

## Статус

Це UI/UX-референс, а не production-код.

Production-реалізація має йти через основний стек проєкту:

- Next.js 15 App Router;
- TypeScript;
- CSS Modules;
- `react-chessboard`;
- `chess.js`;
- Stockfish WASM.

## Що не переносити напряму

- inline styles;
- CDN React/Babel setup;
- sample data;
- tweak panel;
- кастомну дошку як заміну `react-chessboard`;
- PGN paste flow без окремого рішення в специфікації.

Детальний опис того, що беремо з прототипу, лежить у:

```text
../spec/design-prototype.md
```

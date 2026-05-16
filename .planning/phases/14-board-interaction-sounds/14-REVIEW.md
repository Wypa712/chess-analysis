---
phase: 14-board-interaction-sounds
reviewed: 2026-05-16T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/hooks/useClickToMove.ts
  - src/app/(app)/games/[id]/GameView.tsx
  - src/hooks/useChessSound.ts
  - src/hooks/useGameNavigation.ts
  - src/hooks/useExploreMode.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: fixed
fixed: 2026-05-16T13:00:00Z
fixed_findings:
  - CR-01
  - CR-02
  - WR-01
  - WR-02
  - WR-03
  - WR-04
  - WR-05
  - IN-01
---

# Phase 14: Code Review Report

**Reviewed:** 2026-05-16T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Фаза 14 реалізує клік-для-ходу (`useClickToMove`), синтезовані звуки (`useChessSound`), навігацію по ходах із колбеком звуку (`useGameNavigation`) та режим дослідження варіантів (`useExploreMode`). Загальна архітектура добре структурована: хуки розділені за відповідальністю, debounce для звуків реалізований через `useRef`. Виявлено два критичних баги (неправильна логіка умов, витік ресурсів AudioContext) та п'ять попереджень якості/коректності.

---

## Critical Issues

### CR-01: Звук відтворюється при навігації НАЗАД до початкової позиції (`goFirst`)

**File:** `src/hooks/useGameNavigation.ts:19`

**Issue:** `goFirst` завжди викликає `onSoundTrigger?.(-1)`. У `GameView.tsx` (рядок 173) `handleSoundTrigger` повертається достроково якщо `moveIndex < 0`: `if (!parsed || moveIndex < 0) return;`. Тобто звук при `goFirst` не грає — це правильно. Але проблема в іншому: `goPrev` (рядок 23–28) викликає `onSoundTrigger?.(next)` із вже обрахованим `next` значенням. Якщо поточний хід вже `-1` і гравець натискає "Попередній хід", `clampMove(-1 - 1, totalMoves)` = `-1`, тобто `onSoundTrigger?.(-1)` буде викликано — але звуку не буде через guard у `handleSoundTrigger`. Це сáме по собі OK. 

Реальний баг: `goNext` при навігації ВПЕРЕД відтворює звук поточного ходу, але `goPrev` при навігації назад ТАКОЖ відтворює звук поточного ходу (звук ходу, до якого переходять). Тобто при перемотці назад гравець чує звук ходу, який "скасовується", що семантично некоректно — очікується беззвучна навігація назад або спеціальний звук. Однак критичніша проблема: `goFirst` (рядок 18–20) викликає `onSoundTrigger?.(-1)` — guard в `handleSoundTrigger` блокує це. Але `goLast` (рядок 38–42) викликає `onSoundTrigger?.(next)` де `next = totalMoves - 1`, тобто відтворює звук останнього ходу. Якщо `game.result !== undefined` і `moveIndex === parsed.positions.length - 1`, спрацює `isGameOver = true` і прогримить звук кінця гри. Це відбувається при БУДЬ-ЯКОМУ натисканні "Останній хід", навіть якщо гравець вже знаходиться на останньому ході (кнопка disabled лише за `currentMove === totalMoves - 1`, але `goLast` все рівно виконується і знову тригерить звук через `onSoundTrigger`).

Конкретніше: коли `currentMove === totalMoves - 1` кнопка `goLast` задизейблена, тому з UI звук не спрацює. Але `goToMove` та `seekMainline` — НЕ перевіряють, чи змінився `currentMove`. Якщо `goToMove(currentMove)` викликається з тим самим значенням (напр., клік на вже активний хід у списку), `onSoundTrigger` однаково спрацює, і звук відіграє повторно без реального переходу.

**Fix:**
```typescript
// useGameNavigation.ts — не тригерити звук якщо індекс не змінився
const goToMove = useCallback((index: number) => {
  const next = clampMove(index, totalMoves);
  setCurrentMove((prev) => {
    if (prev !== next) onSoundTrigger?.(next);
    return next;
  });
}, [totalMoves, onSoundTrigger]);
```
Аналогічно для `goFirst`, `goLast`, `goPrev`, `goNext` — тригерити звук лише коли `next !== prev`.

---

### CR-02: Витік ресурсів AudioContext — новий контекст на кожен звук

**File:** `src/hooks/useChessSound.ts:19-26`

**Issue:** Функція `getAudioContext()` викликається кожного разу всередині `soundMove()`, `soundCapture()`, `soundCheck()`, `soundCastle()`, `soundGameEnd()` — вона щоразу створює `new AudioContext()`. Браузери мають жорсткий ліміт на кількість одночасно відкритих `AudioContext` (Chrome: 6, Safari: менше). При швидкій навігації по ходах (утримання клавіші стрілки) debounce у 30 мс не захищає від множинних паралельних контекстів — debounce скасовує попередній `setTimeout`, але вже запущені звуки (які ще програють) тримають свій `AudioContext` відкритим. Якщо `ctx.close()` у `setTimeout` не встигає виконатись до наступного виклику, накопичується черга відкритих контекстів.

Додатково: `ctx.close()` викликається через `setTimeout` з розрахунковою тривалістю, але якщо вкладка прихована (Page Visibility API) або браузер throttle-ує таймери, таймаут може не спрацювати вчасно, і `AudioContext` залишиться у стані `running` назавжди до закриття вкладки.

**Fix:**
```typescript
// Зберігати один спільний AudioContext у модульній змінній або useRef у хуку
// useChessSound.ts
export function useChessSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getOrCreateContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }

  // Передавати ctx у playTone замість створення нового в кожній sound-функції
  const playMoveSound = useCallback(({ isCapture, isCheck, isCastle, isGameOver }: PlayMoveSoundParams) => {
    if (pendingRef.current !== null) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      const ctx = getOrCreateContext();
      if (!ctx) return;
      // ... вибір звуку, передача ctx у відповідну функцію
    }, 30);
  }, []);
  // ...
}
```

---

## Warnings

### WR-01: `useClickToMove` не перевіряє колір фігури — можна вибрати фігуру суперника

**File:** `src/hooks/useClickToMove.ts:61-71`

**Issue:** Рядок 59 отримує фігуру через `chess.get(square)`, але не перевіряє, чи ця фігура належить стороні, що ходить. `chess.moves({ square, verbose: true })` для фігури суперника поверне порожній масив (Chess.js не генерує ходи для сторони, яка не ходить), тому `moves.length === 0`, і гілка `else` (рядок 68) очищає вибір. Це технічно не дозволить зробити хід фігурою суперника, але поведінка UX відрізняється: замість того, щоб просто ігнорувати клік або показати вибір (без ходів), код веде себе ідентично кліку на порожню клітинку. Якщо у майбутньому логіку буде розширено (наприклад, попередній перегляд ходів суперника), відсутність явної перевірки кольору може ввести в оману.

Крім того: якщо `selectedSquare` встановлено і гравець клікає на фігуру суперника (яка не є валідною ціллю), код переходить до Step 3 і намагається "вибрати" цю фігуру — виходить очищення замість переходу ходу, що є незрозумілою поведінкою.

**Fix:**
```typescript
// Step 3: перевіряти колір перед вибором
const piece = chess.get(square);
const turnColor = chess.turn(); // 'w' або 'b'
if (piece && piece.color === turnColor) {
  // ... існуюча логіка вибору
}
```

---

### WR-02: `replayExploreMoves` не обробляє невалідний хід — `chess.move()` може кинути виняток

**File:** `src/hooks/useExploreMode.ts:80-83`

**Issue:** У `replayExploreMoves` (рядок 80–83) виклики `chess.move(...)` не загорнуті в `try/catch`. Якщо `movesToReplay` містить хід, який став невалідним (наприклад, через розсинхронізацію `getMainlineFen()` при гонці станів), `chess.move()` кине `Error`. Це призведе до необробленого виключення, яке обрушить компонент (якщо немає Error Boundary).

Порівняно: `handleBoardDrop` (рядок 103–111) коректно обгортає `chess.move()` у `try/catch`. Така ж захист відсутня у `replayExploreMoves`.

**Fix:**
```typescript
const replayExploreMoves = useCallback((movesToReplay: ExploreMove[]) => {
  if (movesToReplay.length === 0) {
    exitExploreMode();
    return;
  }
  const baseFen = getMainlineFen();
  const chess = new Chess(baseFen === "start" ? undefined : baseFen);
  for (const move of movesToReplay) {
    try {
      chess.move({ from: move.from, to: move.to, promotion: "q" });
    } catch {
      // Невалідна позиція — вийти з explore режиму
      exitExploreMode();
      return;
    }
  }
  // ... решта логіки
}, [exitExploreMode, getMainlineFen, onEnterExplore, runExploreAnalysis]);
```

---

### WR-03: Звук при навігації назад у explore-режимі через `goPrev` / клавішу ArrowLeft

**File:** `src/app/(app)/games/[id]/GameView.tsx:343-344` та `src/hooks/useGameNavigation.ts:22-28`

**Issue:** `goPrev` у `GameView.tsx` (рядок 343) викликає `stepExploreBackward()` якщо `exploreMode === true`, і повертає `true` — тобто `goPrevMainline()` не викликається. Але `stepExploreBackward` викликає `replayExploreMoves(explorationMoves.slice(0, -1))`, який входить у explore-режим знову (`onEnterExplore?.()` на рядку 88), і `onExploreMove` НЕ викликається — тобто звук при кроці назад у explore-режимі відсутній. Це правильно семантично. Але при ArrowLeft (рядок 366–370), `stepExploreBackward()` також не тригерить звук — поведінка узгоджена.

Проблема: при `goPrevMainline()` (рядок 344) — якщо explore неактивний, викликається навігація по основній лінії, і `onSoundTrigger` грає звук ходу, ДО ЯКОГО переходять. Це означає, що при перемотці назад на 1 хід звучить той самий тип звуку (наприклад, "взяття"), що і при перемотці вперед до цього ходу. Поведінка є спірною (відтворення звуку кроку назад), але оскільки в специфікації фази немає вказівки на беззвучну навігацію назад, це варнінг, не блокер.

**Fix:** Передавати напрямок навігації в `onSoundTrigger` або взагалі не грати звук при навігації назад:
```typescript
// useGameNavigation.ts
const goPrev = useCallback(() => {
  setCurrentMove((move) => {
    const next = clampMove(move - 1, totalMoves);
    // Не тригерити звук при навігації назад
    return next;
  });
}, [totalMoves]);
```

---

### WR-04: `handleSoundTrigger` визначає `isGameOver` лише для останнього ходу, але `isCheck` для `#` (мат) буде `true` одночасно — обидва звуки конкурують

**File:** `src/app/(app)/games/[id]/GameView.tsx:178-182`

**Issue:** При матовому ході SAN буде, наприклад, `Qh7#`. Тоді:
- `isCheck = san.includes("+") || san.includes("#")` → `true`
- `isGameOver = moveIndex === parsed.positions.length - 1 && game.result !== undefined` → `true` (якщо це останній хід)

Приорітет в `useChessSound.ts` (рядок 129): `if (isGameOver)` перевіряється першим, тому грає `soundGameEnd()` — це правильно.

Але якщо гра завершилась патом (stalemate), SAN останнього ходу не містить `#`, тобто `isCheck = false`, `isGameOver = true` — і гра `soundGameEnd()`. Це теж правильно.

Однак: `isGameOver` перевіряє лише `game.result !== undefined`. Тип `GameData.result` — `"win" | "loss" | "draw"`, тобто він завжди визначений. Умова `game.result !== undefined` завжди `true`. Це означає, що `isGameOver` буде `true` для БУДЬ-ЯКОГО останнього ходу в будь-якій грі — тобто звук кінця гри завжди грає при переході до останнього ходу, навіть якщо це просто останній хід завантаженої партії для перегляду. Це може бути навмисним (грати "кінець гри" при першому перегляді останнього ходу), але звук також грає при кожному повторному переході до останнього ходу (через `goLast` або клік у списку ходів) — що виглядає як баг.

**Fix:**
```typescript
// GameView.tsx — відтворювати ігровий звук лише один раз або відрізняти 
// "щойно зроблений хід" від "навігація до збереженого ходу"
// Найпростіше: isGameOver лише при explore-ході, не при перегляді:
const isGameOver = false; // при навігації mainline ніколи не грати "game over"
```
Або додати стан `hasPlayedGameOverSound`:
```typescript
const gameOverPlayedRef = useRef(false);
// Тригерити isGameOver лише якщо !gameOverPlayedRef.current, потім встановити true
```

---

### WR-05: `goFirst` у `GameView.tsx` викликає `clearSelection()` двічі

**File:** `src/app/(app)/games/[id]/GameView.tsx:337-341`

**Issue:** `goFirst` у `GameView.tsx` (рядок 337–341):
```typescript
const goFirst = () => {
  exitExploreIfActive();  // → clearSelection() всередині
  clearSelection();       // ← дублікат
  goFirstMainline();
};
```
`exitExploreIfActive` (рядок 327–330) завжди викликає `clearSelection()` незалежно від того, чи активний explore-режим. Тому явний виклик `clearSelection()` на рядку 339 є зайвим. Аналогічна ситуація в `goNext` (рядок 346) та `goLast` (рядок 347–351).

Це не призводить до помилки, але вказує на неуважність і може заплутати при майбутньому рефакторингу.

**Fix:**
```typescript
const goFirst = () => {
  exitExploreIfActive(); // вже містить clearSelection()
  goFirstMainline();
};
const goNext = () => { exitExploreIfActive(); goNextMainline(); };
const goLast = () => { exitExploreIfActive(); goLastMainline(); };
```

---

## Info

### IN-01: `san` параметр передається у `playMoveSound`, але не використовується

**File:** `src/hooks/useChessSound.ts:119`

**Issue:** `PlayMoveSoundParams` визначає поле `san?: string` (рядок 12), і воно передається при кожному виклику (`playMoveSound({ san, ... })`), але всередині `playMoveSound` (рядок 119) параметр `san` деструктурується зі списку, проте не використовується в жодній умові — вибір звуку базується виключно на булевих прапорах. Це мертвий параметр в інтерфейсі, який вводить в оману.

**Fix:** Прибрати `san` з `PlayMoveSoundParams` та з усіх місць виклику, або задокументувати, що він зарезервований для майбутнього використання.

---

### IN-02: Магічні числа кольорів дошки дубльовані між `useClickToMove.ts` і `GameView.tsx`

**File:** `src/hooks/useClickToMove.ts:96,107,113` та `src/app/(app)/games/[id]/GameView.tsx:229,230,508,509`

**Issue:** Кольори підсвітки клітинок (`rgba(79, 183, 162, ...)`, `rgba(109, 174, 219, ...)`) жорстко закодовані в обох файлах як inline рядки. При зміні теми або кольорів дошки доведеться оновлювати їх у кількох місцях.

**Fix:** Винести кольори в CSS-змінні або константи:
```typescript
// constants/boardColors.ts
export const HIGHLIGHT_MOVE_FROM = "rgba(109, 174, 219, 0.24)";
export const HIGHLIGHT_MOVE_TO   = "rgba(79, 183, 162, 0.38)";
export const HIGHLIGHT_SELECTED  = "rgba(79, 183, 162, 0.45)";
export const HIGHLIGHT_LEGAL_DOT = "rgba(79, 183, 162, 0.65)";
export const HIGHLIGHT_CAPTURE   = "rgba(79, 183, 162, 0.75)";
```

---

_Reviewed: 2026-05-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

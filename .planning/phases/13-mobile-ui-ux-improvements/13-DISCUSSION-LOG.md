# Phase 13: Mobile UI/UX Improvements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 13-mobile-ui-ux-improvements
**Areas discussed:** Pull-to-refresh дія, Ряд ходів над полем, Розмір поля на мобайлі, Розмір кнопок навігації

---

## Pull-to-refresh дія

| Option | Description | Selected |
|--------|-------------|----------|
| Sync: імпорт нових партій | Те саме що SyncStatusBar — завантажує нові партії з chess.com/lichess | ✓ |
| Refresh: перезавантажити список | Просто invalidateQueries — оновлює вже імпортований список без нового імпорту | |

**User's choice:** Sync: імпорт нових партій
**Notes:** Хоче повноцінний sync, а не просто refresh кешу.

---

## Візуальний feedback pull-to-refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Спінер + SyncStatusBar | SVG-спінер при свайпі, потім SyncStatusBar показує прогрес | ✓ |
| Тільки SyncStatusBar | Pull-to-refresh натискає SyncStatusBar без додаткових ефектів | |

**User's choice:** Спінер + SyncStatusBar

---

## Ряд ходів — авто-скрол

| Option | Description | Selected |
|--------|-------------|----------|
| Так, авто-скрол при навігації | Поточний хід завжди видний у рядку | ✓ |
| Ні, хай прокручують вручну | Рядок стоїть нерухомо | |

**User's choice:** Так, авто-скрол при навігації

---

## Ряд ходів — нотація

| Option | Description | Selected |
|--------|-------------|----------|
| 1.e4 e5 2.Nf3... | Стандартна шахова нотація з номерами ходів — максимально компактно | ✓ |
| 1. e4 \| e5 \| 2. Nf3 \| ... | Кожен хід окремо — більше місця, зручніше тапати конкретний хід | |

**User's choice:** 1.e4 e5 2.Nf3... (компактні пари)

---

## Розмір поля та eval bar на мобайлі

| Option | Description | Selected |
|--------|-------------|----------|
| Eval bar горизонтально над полем | Тонка горизонтальна смужка ~12px над полем, поле займає повну ширину | ✓ |
| Залишити вертикальний eval bar зліва | Без змін 24px зліва від поля | |
| Прибрати eval bar | Поле отримує повну ширину екрану мінус padding | |

**User's choice:** Eval bar горизонтально над полем
**Notes:** Користувач сам запропонував цю ідею — "а можна кудись її перемістити щоб це норм виглядало? умовно перелік ходів най буде під дошкою, а евал бар над дошкою"

---

## Розмір кнопок навігації на мобайлі

| Option | Description | Selected |
|--------|-------------|----------|
| 56px × 56px | З запасом на промахи | |
| 48px × 48px | Мінімальний рекомендований мобільний розмір, крок від зараз (44px) | ✓ |
| Додати свайп по шахівниці | Swipe left/right по шахівниці = prev/next хід | |

**User's choice:** 48px × 48px

---

## Claude's Discretion

- Точна висота горизонтального eval bar (запропоновано ~12px)
- Стиль анімації fill горизонтального eval bar
- Висота рядку ходів
- Threshold для pull-to-refresh drag (запропоновано ≥60px)

## Deferred Ideas

- Свайп по шахівниці (left/right = prev/next хід) — потенційно конфліктує з explore mode drag-drop. Залишено для майбутнього обговорення.

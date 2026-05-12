import { useId } from "react";

export function FirstIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Перший хід"}</title>
      <path d="M19 20L9 12l10-8v16z M5 19V5" />
    </svg>
  );
}

export function PrevIcon({ size = 18, ariaLabel }: { size?: number; ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Попередній хід"}</title>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function NextIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Наступний хід"}</title>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function LastIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Останній хід"}</title>
      <path d="M5 4l10 8-10 8V4z M19 5v14" />
    </svg>
  );
}

export function FlipIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Перевернути дошку"}</title>
      <path d="M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export function ReturnToMainlineIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Повернутись до основної лінії"}</title>
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 0 1 0 10h-2" />
    </svg>
  );
}

export function StockfishIcon({ ariaLabel }: { ariaLabel?: string }) {
  const id = useId();
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" role="img" aria-labelledby={id}>
      <title id={id}>{ariaLabel ?? "Аналіз Stockfish"}</title>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

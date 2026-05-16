import styles from "./RouteLoader.module.css";

const CELL_COUNT = 9;

export function RouteLoader({
  text,
  inline = false,
}: {
  text?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={inline ? styles.loaderInline : styles.loader}
      aria-live="polite"
    >
      <div className={styles.board} aria-hidden="true">
        {Array.from({ length: CELL_COUNT }, (_, i) => (
          <div
            key={i}
            className={`${styles.cell} ${
              (Math.floor(i / 3) + (i % 3)) % 2 === 0
                ? styles.cellLight
                : styles.cellDark
            }`}
          />
        ))}
      </div>
      {inline && text && <p className={styles.text}>{text}</p>}
    </div>
  );
}

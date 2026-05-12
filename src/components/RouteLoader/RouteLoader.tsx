import styles from "./RouteLoader.module.css";

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
      <div className={styles.spinner} aria-hidden="true" />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}

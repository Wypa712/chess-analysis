"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function usePullToRefresh(onTrigger: () => void): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  indicatorStyle: React.CSSProperties;
  isReady: boolean;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Stable refs so handlers don't capture stale closures
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isReadyRef = useRef(false);
  const dragYRef = useRef(0);
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => { onTriggerRef.current = onTrigger; });

  const reset = useCallback(() => {
    setDragY(0);
    setIsDragging(false);
    setIsReady(false);
    isDraggingRef.current = false;
    isReadyRef.current = false;
    dragYRef.current = 0;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = el;

    function onTouchStart(e: TouchEvent) {
      const scrollRoot = target.closest<HTMLElement>("[data-scroll-root]") ?? target;
      if (scrollRoot.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
      setIsDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current) return;

      const delta = e.touches[0].clientY - startYRef.current;

      if (delta < 0) {
        // Scrolling up — exit dragging
        isDraggingRef.current = false;
        setIsDragging(false);
        setDragY(0);
        setIsReady(false);
        dragYRef.current = 0;
        isReadyRef.current = false;
        return;
      }

      const clamped = Math.min(delta, 80);
      dragYRef.current = clamped;
      setDragY(clamped);

      const ready = clamped >= 60;
      isReadyRef.current = ready;
      setIsReady(ready);

      // Prevent page scroll while dragging
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!isDraggingRef.current) return;

      if (isReadyRef.current) {
        onTriggerRef.current();
        // Keep indicator briefly visible, then snap back
        setTimeout(() => {
          reset();
        }, 300);
      } else {
        reset();
      }
    }

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    target.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", reset);
    };
  }, [reset]);

  const indicatorStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: `translateX(-50%) translateY(${Math.min(dragY - 36, 44)}px)`,
    opacity: Math.min(dragY / 60, 1),
    transition: isDragging
      ? "none"
      : "transform 0.25s ease, opacity 0.2s ease",
    width: 36,
    height: 36,
  };

  return { containerRef, indicatorStyle, isReady };
}

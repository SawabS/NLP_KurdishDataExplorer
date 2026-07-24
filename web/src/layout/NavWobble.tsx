import { useEffect, useRef, type RefObject } from "react";

interface NavWobbleProps {
  targetRef: RefObject<HTMLElement | null>;
}

/** Theme-aware pointer treatment for the glass app bar. It is deliberately
 * progressive enhancement: touch, coarse-pointer, and reduced-motion users
 * keep the native cursor and never activate the animated layer. */
export function NavWobble({targetRef}: NavWobbleProps) {
  const followerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    const follower = followerRef.current;
    const canAnimate = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!target || !follower || !canAnimate.matches) return;

    const move = (event: PointerEvent) => {
      const bounds = target.getBoundingClientRect();
      follower.style.transform = `translate3d(${event.clientX - bounds.left - 24}px, ${event.clientY - bounds.top - 24}px, 0)`;
      follower.dataset.visible = "true";
    };
    const hide = () => { follower.dataset.visible = "false"; };

    target.addEventListener("pointerenter", move);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerleave", hide);
    return () => {
      target.removeEventListener("pointerenter", move);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerleave", hide);
    };
  }, [targetRef]);

  return (
    <span ref={followerRef} className="kdx-nav-wobble" data-visible="false" aria-hidden="true">
      <span />
    </span>
  );
}

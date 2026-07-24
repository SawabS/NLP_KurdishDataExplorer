import { useEffect, useRef } from "react";

/** Theme-aware pointer treatment across the application. It is deliberately
 * progressive enhancement: touch, coarse-pointer, and reduced-motion users
 * keep the native cursor and never activate the animated layer. */
export function SiteWobble() {
  const followerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const follower = followerRef.current;
    const canAnimate = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!follower || !canAnimate.matches) return;

    document.documentElement.classList.add("kdx-custom-cursor");

    const move = (event: PointerEvent) => {
      follower.style.transform = `translate3d(${event.clientX - 17}px, ${event.clientY - 17}px, 0)`;
      follower.dataset.visible = "true";
    };
    const hide = () => { follower.dataset.visible = "false"; };
    const press = () => { follower.dataset.pressed = "true"; };
    const release = () => { follower.dataset.pressed = "false"; };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      document.documentElement.classList.remove("kdx-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <span ref={followerRef} className="kdx-site-wobble" data-visible="false" data-pressed="false" aria-hidden="true">
      <span />
    </span>
  );
}

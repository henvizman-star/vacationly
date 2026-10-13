import { useEffect, useRef } from "react";

// Move only a decorative layer, at most once per frame; page content never shifts.
export function ScenicBackground() {
    const layer = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const motion = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 650px)");
        let frame = 0;
        const update = () => {
            frame = 0;
            // Bound movement within the image's overscan so its edges cannot appear.
            const distance = motion.matches ? 0 : Math.min(Math.max(window.scrollY * 0.08, 0), 110);
            layer.current?.style.setProperty("--scene-offset", `${distance}px`);
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        motion.addEventListener("change", schedule);
        return () => {
            window.removeEventListener("scroll", schedule);
            motion.removeEventListener("change", schedule);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);
    return <div ref={layer} className="scenic-background" aria-hidden="true" />;
}

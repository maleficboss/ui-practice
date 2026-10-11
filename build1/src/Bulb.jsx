import { useEffect, useRef } from "react";

// Phase 1: Look-and-feel constants
// Defined outside the component so they are created once, not on every render:
// the grain mask, the switch-on flicker, the dimmed "off" level and the shared glow position.

/* Noise used as an alpha mask on the outer glow, gives the stippled look. */
const GRAIN = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -4.2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/* Quick flicker when the bulb switches on. Web Animations API, so no CSS keyframes needed. */
const FLICKER = [
    { opacity: 0 },
    { opacity: 0.9, offset: 0.1 },
    { opacity: 0.15, offset: 0.18 },
    { opacity: 1, offset: 0.3 },
    { opacity: 0.45, offset: 0.4 },
    { opacity: 1, offset: 0.55 },
    { opacity: 1 },
];

const BULB_OFF_OPACITY = 0.22; // set to 0 to hide the bulb completely until a valid wallet is pasted

const glowBase = {
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
};

/*
on=true when the bulb should be lit
glassRef=ref attached to the glass, App uses it to find where the light is
Must be rendered inside a position:relative wrapper around the Scan button.
*/

function Bulb({ on, glassRef }) {
    // Phase 2: Flicker when the bulb turns on
    // Whenever "on" becomes true, play the flicker once on the glow.
    // Skipped for users whose system asks for reduced motion.
    const glowRef = useRef(null);

    useEffect(() => {
        if (!on || !glowRef.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        glowRef.current.animate(FLICKER, { duration: 800, easing: "ease-out" });
    }, [on]);


    // Phase 3: Socket colours
    // Brass when lit, dark when off. The fill and stroke fade between the two.
    const socketStyle = {
        fill: on ? "#5a4a2c" : "#1d1a15",
        stroke: on ? "#b39860" : "#4a4032",
        transition: "fill .3s, stroke .3s",
    };

    
    // Phase 4: Render
    // A box pinned above the Scan button holding three layers:
    // the cord, the glow (grainy outer halo + smooth inner halo), and the SVG socket and glass.
    // The glass path carries glassRef, which is what App measures to place the background.
    return (
        <div
            aria-hidden="true"
            style={{
                position: "absolute",
                zIndex: 0,
                left: "50%",
                bottom: "100%",
                width: 46,
                height: 67,
                marginBottom: 8, // gap between the glass and the button
                transform: "translateX(-50%)",
                opacity: on ? 1 : BULB_OFF_OPACITY,
                transition: "opacity .3s",
                pointerEvents: "none",
            }}
        >
            {/* cord: runs from the socket up past the top of the screen */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "100%",
                    width: 2,
                    height: "100vh",
                    marginLeft: -1,
                    background: "repeating-linear-gradient(180deg, #4a3f2b 0 3px, #2f281b 3px 6px)",
                }}
            />

            {/* glow, anchored on the globe of the bulb */}
            <div
                ref={glowRef}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: 46,
                    width: 0,
                    height: 0,
                    opacity: on ? 1 : 0,
                    transition: "opacity .4s",
                }}
            >
                {/* grainy outer halo */}
                <div
                    style={{
                        ...glowBase,
                        width: 300,
                        height: 300,
                        background:
                            "radial-gradient(circle, rgba(255,205,110,1) 0%, rgba(255,180,70,.75) 35%, transparent 68%)",
                        WebkitMaskImage: GRAIN,
                        maskImage: GRAIN,
                        WebkitMaskSize: "220px 220px",
                        maskSize: "220px 220px",
                    }}
                />
                {/* smooth inner halo */}
                <div
                    style={{
                        ...glowBase,
                        width: 150,
                        height: 150,
                        background:
                            "radial-gradient(circle, rgba(255,226,150,.75) 0%, rgba(255,190,80,.28) 40%, transparent 70%)",
                    }}
                />
            </div>

            {/* socket and glass */}
            <svg
                viewBox="0 0 60 88"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: "relative", display: "block", width: "100%", height: "100%", overflow: "visible" }}
            >
                <rect x="19" y="0" width="22" height="26" rx="3" strokeWidth="1" style={socketStyle} />
                <path
                    d="M19 8h22M19 14h22M19 20h22"
                    strokeWidth="1"
                    style={{ fill: "none", stroke: socketStyle.stroke, transition: "stroke .3s" }}
                />
                <path
                    ref={glassRef}
                    d="M24 26C24 34 6 40 6 60a24 24 0 0 0 48 0C54 40 36 34 36 26Z"
                    strokeWidth="1"
                    style={{
                        fill: on ? "#fff4d8" : "#14130f",
                        stroke: on ? "#ffe9b0" : "#3a352d",
                        filter: on ? "drop-shadow(0 0 8px rgba(255,208,110,.95))" : "none",
                        transition: "fill .25s, stroke .25s, filter .25s",
                    }}
                />
            </svg>
        </div>
    );
}

export default Bulb;
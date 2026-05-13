import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { gsap } from 'gsap';

type TunnelMode = 'idle' | 'wiping' | 'arriving';

export type OverlayPhase =
    | 'idle'
    | 'rising'
    | 'peak'
    | 'falling'
    | 'cancelling';

type MutableModeRef = { current: TunnelMode };

export type TunnelController = {
    modeRef: MutableModeRef;
    isActive: boolean;
    overlayPhase: OverlayPhase;
    startTunnel: (onSwitch: () => void) => void;
    cancelTunnel: () => void;
    finishArrival: (onArrived?: () => void) => void;
};

const TunnelContext = createContext<TunnelController | null>(null);

const SAFETY_TIMEOUT_MS = 5000;

// Timing constants — kept in sync with the CSS @keyframes in tunnel.css.
// The lead-in (rise + fall) is intentionally short so the premium
// scanline becomes visible quickly. The scanline itself stays at 2s —
// that's where the "buttery" feel lives, not in the cover-up.
const OVERLAY_RISE_DELAY_MS = 0;
const OVERLAY_RISE_DURATION_MS = 320;
const ROUTE_SWAP_AT_MS = 300; // just before peak completes
const OVERLAY_FALL_DURATION_MS = 550;
// When the falling overlay reaches ≈0.55 opacity (~50ms into the
// cubic-bezier(0.16, 1, 0.3, 1) fall over 550ms) — fire the scanline
// reveal so the veil-drop and reveal read as one continuous breath.
const REVEAL_TRIGGER_MS = 50;
const CANCEL_DURATION_MS = 180;
// Hold the canvas-pause flag for the scanline's full run after the
// overlay completes its fall. Scanline starts REVEAL_TRIGGER_MS into
// the fall and runs ~2s total — round up for safety.
const SCANLINE_REMAINING_MS = 1500;

/**
 * Sober "Digital Wipe" page transition.
 *
 * Flow on click:
 *   1. UI elements fade up-and-out (GSAP on text elements)        (0 → 0.5s)
 *   2. Overlay rises 0 → 1 (CSS animation, --rising class)        (0.25 → 0.8s)
 *   3. navigate() fires at peak                                   (0.75s)
 *   4. finishArrival() → overlay falls 1 → 0 (CSS, --falling)     (0 → 0.85s)
 *   5. ~80ms into the fall, scanline reveal starts (also CSS)
 *
 * The overlay opacity is entirely CSS-animation-driven. No GSAP tween
 * on opacity, no RAF loop in QuantumTunnelOverlay — both used to run on
 * the main thread and stutter when React reconciled the destination
 * route + Three.js compiled shaders. With CSS animations, the compositor
 * carries the entire visual ramp, immune to main-thread stalls.
 */
export function TunnelProvider({ children }: { children: ReactNode }) {
    const modeRef = useRef<TunnelMode>('idle');
    // Reactive flag: Three.js Canvas hosts subscribe via `useTunnelActive()`
    // and pause their frameloop while true so the GPU isn't contended
    // during the overlay's opacity blend pass or the scanline sweep.
    const [isActive, setIsActive] = useState(false);
    // Reactive phase: QuantumTunnelOverlay reads via `useTunnelOverlayPhase()`
    // and toggles its CSS animation class. State, not ref, so React
    // re-renders the overlay element with the correct class.
    const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>('idle');

    const activeCtxRef = useRef<gsap.Context | null>(null);
    const safetyTimerRef = useRef<number | null>(null);
    const revealCompleteTimerRef = useRef<number | null>(null);
    // Pending setTimeouts that drive the overlay phase transitions and the
    // reveal trigger. Cleared on cancel/cleanup so a fast successive
    // navigation never leaves a stale timer firing into the wrong state.
    const phaseTimersRef = useRef<number[]>([]);
    const escHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

    const clearPhaseTimers = useCallback(() => {
        for (const id of phaseTimersRef.current) window.clearTimeout(id);
        phaseTimersRef.current = [];
    }, []);

    const schedulePhase = useCallback((delayMs: number, fn: () => void) => {
        const id = window.setTimeout(() => {
            phaseTimersRef.current = phaseTimersRef.current.filter(
                (t) => t !== id,
            );
            fn();
        }, delayMs);
        phaseTimersRef.current.push(id);
    }, []);

    const cleanupContext = useCallback(() => {
        if (activeCtxRef.current) {
            activeCtxRef.current.revert();
            activeCtxRef.current = null;
        }
        if (safetyTimerRef.current !== null) {
            window.clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }
        if (revealCompleteTimerRef.current !== null) {
            window.clearTimeout(revealCompleteTimerRef.current);
            revealCompleteTimerRef.current = null;
        }
        clearPhaseTimers();
        if (escHandlerRef.current) {
            window.removeEventListener('keydown', escHandlerRef.current);
            escHandlerRef.current = null;
        }
    }, [clearPhaseTimers]);

    const cancelTunnel = useCallback(() => {
        if (modeRef.current === 'idle') return;
        clearPhaseTimers();
        setOverlayPhase('cancelling');
        window.setTimeout(() => {
            setOverlayPhase('idle');
            cleanupContext();
            modeRef.current = 'idle';
            setIsActive(false);
        }, CANCEL_DURATION_MS);
    }, [cleanupContext, clearPhaseTimers]);

    const startTunnel = useCallback(
        (onSwitch: () => void) => {
            if (modeRef.current !== 'idle') return;
            modeRef.current = 'wiping';
            setIsActive(true);

            // UI fade stays on GSAP — it targets text elements (Header,
            // NavMenu, hero) where main-thread cost is negligible.
            const ctx = gsap.context(() => {
                gsap.to(
                    '.Header, .NavMenu, .Home-hero-text, [data-tunnel-fade]',
                    {
                        opacity: 0,
                        y: -12,
                        scale: 0.99,
                        duration: 0.28,
                        ease: 'power2.in',
                        overwrite: true,
                    },
                );
            });
            activeCtxRef.current = ctx;

            // Overlay rise — CSS animation kicks in at 250ms.
            schedulePhase(OVERLAY_RISE_DELAY_MS, () => {
                setOverlayPhase('rising');
            });

            // Lock to peak just before route swap; route swap happens at
            // 750ms which is just inside the rising animation's 800ms end
            // (250 + 550). The 50ms inset hides the route mount behind a
            // fully-opaque overlay.
            schedulePhase(
                OVERLAY_RISE_DELAY_MS + OVERLAY_RISE_DURATION_MS - 50,
                () => {
                    setOverlayPhase('peak');
                },
            );

            // Route swap at peak.
            schedulePhase(ROUTE_SWAP_AT_MS, () => {
                modeRef.current = 'arriving';
                onSwitch();
            });

            const onEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') cancelTunnel();
            };
            escHandlerRef.current = onEsc;
            window.addEventListener('keydown', onEsc);

            safetyTimerRef.current = window.setTimeout(() => {
                if (modeRef.current === 'wiping') cancelTunnel();
            }, SAFETY_TIMEOUT_MS);
        },
        [cancelTunnel, schedulePhase],
    );

    const finishArrival = useCallback(
        (onArrived?: () => void) => {
            // If the overlay isn't currently covering (deep link / no
            // prior tunnel), reveal immediately.
            if (overlayPhase !== 'peak' && overlayPhase !== 'rising') {
                onArrived?.();
                cleanupContext();
                modeRef.current = 'idle';
                setIsActive(false);
                return;
            }

            // Start the overlay fall animation.
            setOverlayPhase('falling');

            // Fire the reveal callback shortly after the fall begins —
            // matches the prior `flashOpacityRef.current < 0.55` trigger.
            const revealTimer = window.setTimeout(() => {
                onArrived?.();
            }, REVEAL_TRIGGER_MS);
            phaseTimersRef.current.push(revealTimer);

            // When the overlay reaches 0, clean up and hold isActive for
            // the remaining scanline runtime.
            const completeTimer = window.setTimeout(() => {
                phaseTimersRef.current = phaseTimersRef.current.filter(
                    (t) => t !== completeTimer,
                );
                setOverlayPhase('idle');
                cleanupContext();
                modeRef.current = 'idle';
                revealCompleteTimerRef.current = window.setTimeout(() => {
                    revealCompleteTimerRef.current = null;
                    setIsActive(false);
                }, SCANLINE_REMAINING_MS);
            }, OVERLAY_FALL_DURATION_MS);
            phaseTimersRef.current.push(completeTimer);
        },
        [cleanupContext, overlayPhase],
    );

    useEffect(() => {
        return () => {
            cleanupContext();
        };
    }, [cleanupContext]);

    const value = useMemo<TunnelController>(
        () => ({
            modeRef,
            isActive,
            overlayPhase,
            startTunnel,
            cancelTunnel,
            finishArrival,
        }),
        [isActive, overlayPhase, startTunnel, cancelTunnel, finishArrival],
    );

    return (
        <TunnelContext.Provider value={value}>{children}</TunnelContext.Provider>
    );
}

export function useTunnel(): TunnelController {
    const ctx = useContext(TunnelContext);
    if (!ctx) {
        throw new Error('useTunnel must be used inside <TunnelProvider>');
    }
    return ctx;
}

/**
 * Returns `true` while a route tunnel transition is animating. Safe to use
 * outside a TunnelProvider — returns `false` in that case. Subscribe from
 * Three.js Canvas hosts to pause their frameloop and free the GPU for the
 * tunnel's transform animation.
 */
export function useTunnelActive(): boolean {
    const ctx = useContext(TunnelContext);
    return ctx?.isActive ?? false;
}

/**
 * Returns the current overlay phase for the CSS-animated black layer.
 * Used by QuantumTunnelOverlay to toggle its `.QuantumTunnel-overlay--<phase>`
 * class. Safe to use outside a TunnelProvider — returns `'idle'` in that case.
 */
export function useTunnelOverlayPhase(): OverlayPhase {
    const ctx = useContext(TunnelContext);
    return ctx?.overlayPhase ?? 'idle';
}

"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';

export function CustomCursor() {
    const [isHovering, setIsHovering] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // ARCHITECTURE: Raw Coordinate Tracking (The Anchor)
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    // ARCHITECTURE: LERP Coordinate Tracking (The Liquid Ring)
    const ringX = useMotionValue(-100);
    const ringY = useMotionValue(-100);

    // Mutable refs to hold the absolute target position without triggering React renders
    const targetX = useRef(-100);
    const targetY = useRef(-100);

    useEffect(() => {
        // Strict Coarse Pointer detection (Disables custom cursor on mobile/touch)
        if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
            setIsTouchDevice(true);
            return;
        }

        const moveCursor = (e) => {
            // Instantly snap the anchor dot
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            
            // Update the target for the LERP loop
            targetX.current = e.clientX;
            targetY.current = e.clientY;
            
            if (!isVisible) setIsVisible(true);
        };

        // Contextual Intelligence: Detects clicks, links, and inputs globally
        const handleMouseOver = (e) => {
            if (e.target.closest('a, button, input, textarea, select, [role="button"]')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        // ARCHITECTURE: The GSAP-Style LERP Engine (High Velocity)
        let animationFrameId;
        const renderLoop = () => {
            // LERP Math: Increased from 0.15 to 0.35 for a much faster, tighter follow
            ringX.set(ringX.get() + (targetX.current - ringX.get()) * 0.50);
            ringY.set(ringY.get() + (targetY.current - ringY.get()) * 0.50);
            
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        // Start the engine
        renderLoop();

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
            cancelAnimationFrame(animationFrameId);
        };
    }, [cursorX, cursorY, ringX, ringY, isVisible]);

    // Safety net: Render nothing on mobile
    if (isTouchDevice) return null;

    return (
        <>
            {/* Global Override: Hides default OS cursor only when component is active */}
            <style dangerouslySetInnerHTML={{__html: `* { cursor: none !important; }`}} />
            
            {/* LAYER 1: The Immediate Anchor Dot */}
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[9999]"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: "-50%",
                    translateY: "-50%",
                    willChange: "transform"
                }}
            >
                <motion.div 
                    className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    animate={{
                        scale: isHovering ? 0 : 1,
                        opacity: isVisible ? 1 : 0
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ willChange: "transform, opacity" }}
                />
            </motion.div>

            {/* LAYER 2: The Liquid Trailing Ring (Driven by LERP Engine) */}
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[9998]"
                style={{
                    x: ringX,
                    y: ringY,
                    translateX: "-50%",
                    translateY: "-50%",
                    willChange: "transform"
                }}
            >
                <motion.div 
                    className="w-8 h-8 border rounded-full backdrop-blur-[1px]"
                    animate={{
                        scale: isHovering ? 1.8 : 1,
                        backgroundColor: isHovering ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0)",
                        borderColor: isHovering ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.4)",
                        opacity: isVisible ? 1 : 0
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ willChange: "transform, opacity, background-color, border-color" }}
                />
            </motion.div>
        </>
    );
}
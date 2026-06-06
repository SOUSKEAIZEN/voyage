"use client";

import { motion } from 'framer-motion';

export function AmbientAurora() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* ARCHITECT NOTE: 
              - Removed 'blur-[120px]' entirely.
              - Replaced with hardware-friendly 'radial-gradient'.
              - Added 'willChange: transform' to force the node onto a dedicated GPU layer.
            */}
            
            {/* Indigo Node */}
            <motion.div
                animate={{ x: [0, 100, -50, 0], y: [0, -50, 100, 0], scale: [1, 1.1, 0.9, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                style={{ willChange: "transform" }}
                className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_60%)]"
            />
            
            {/* Violet Node */}
            <motion.div
                animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.9, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ willChange: "transform" }}
                className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,transparent_60%)]"
            />
            
            {/* Fuchsia Node */}
            <motion.div
                animate={{ x: [0, 50, -100, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                style={{ willChange: "transform" }}
                className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.12)_0%,transparent_60%)]"
            />
        </div>
    );
}
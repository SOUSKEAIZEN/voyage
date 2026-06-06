"use client";

import Link from 'next/link';

export default function CursorTestPage() {
    return (
        <main className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col items-center justify-center p-10">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-zinc-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sterile Environment
                </div>
                
                <h1 className="text-4xl font-medium tracking-tight text-white">Physics Diagnostic</h1>
                
                <p className="text-sm text-zinc-500 leading-relaxed">
                    This page is completely stripped of heavy DOM elements. There are no ambient blurs, no glowing meshes, and no staggered layout animations. 
                </p>

                <div className="py-12 flex flex-col items-center gap-6">
                    <button className="px-8 py-4 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-[10px] transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        Test Hover Physics
                    </button>
                    
                    <Link href="/" className="text-zinc-500 hover:text-white transition-colors text-xs font-medium tracking-wide border-b border-zinc-800 hover:border-zinc-500 pb-1">
                        Navigate to Hub
                    </Link>
                </div>

                <div className="mt-10 p-6 border border-white/[0.05] rounded-3xl bg-white/[0.01] text-left">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">Diagnostic Protocol:</h3>
                    <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4 marker:text-zinc-700">
                        <li>Move your mouse rapidly in circles.</li>
                        <li>Hover over the button to test the magnetic expansion snap.</li>
                        <li>If the cursor is buttery smooth here, the cursor math is perfect. The lag on other pages is caused by GPU compositing limits (likely the `blur-[120px]` in the Aurora background).</li>
                        <li>If the cursor still feels sluggish here, we need to alter the `requestAnimationFrame` velocity.</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
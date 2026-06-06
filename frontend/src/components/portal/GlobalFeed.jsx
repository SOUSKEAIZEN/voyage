"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAbyss } from '@/components/AbyssProvider';
import { fetchEventEchos } from '@/services/api'; 

export function GlobalFeed({ eventSlug, guestId }) {
    const { socket, isConnected } = useAbyss();
    const [echos, setEchos] = useState([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const scrollRef = useRef(null);

    // [Architecture] Ledger Synchronization (Fetch History on Mount)
    useEffect(() => {
        let isMounted = true;
        const loadHistory = async () => {
            try {
                const history = await fetchEventEchos(eventSlug);
                if (isMounted) {
                    setEchos(history);
                    setIsLoadingHistory(false);
                    // Force scroll to bottom after history loads
                    setTimeout(() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }, 100);
                }
            } catch (error) {
                console.error("Failed to load echo history", error);
                if (isMounted) setIsLoadingHistory(false);
            }
        };
        loadHistory();
        return () => { isMounted = false; };
    }, [eventSlug]);

    // [Architecture] Ephemeral Mesh Subscription (Real-time updates)
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit('join_abyss');

        const handleReceiveEcho = (payload) => {
            setEchos((prev) => [...prev, payload]);
            
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 50);
        };

        socket.on('receive_global_echo', handleReceiveEcho);

        return () => {
            socket.off('receive_global_echo', handleReceiveEcho);
        };
    }, [socket, isConnected]);

    const handleSendEcho = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket || !isConnected) return;

        setIsSending(true);
        
        socket.emit('send_global_echo', { content: input }, (response) => {
            setIsSending(false);
            if (response.success) {
                setInput('');
            } else {
                console.error('[Global Feed] Failed to emit echo:', response.message);
            }
        });
    };

    return (
        <div 
            // [Architecture] Mobile UI: Use fluid viewport height on mobile to prevent cutoffs, fixed 500px on desktop
            className="group relative overflow-hidden w-full h-[70vh] md:h-[500px] flex flex-col bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] transition-all duration-500 hover:[box-shadow:0_0_40px_color-mix(in_srgb,var(--tenant-primary)_10%,transparent)]"
            style={{ borderRadius: 'var(--tenant-radius)' }}
        >
            {/* Themed Holographic Sweep (Hidden on mobile to save GPU) */}
            <div className="hidden md:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 10%, transparent), transparent)' }} />

            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.05] flex items-center justify-between relative z-10 bg-black/20">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 md:w-4 md:h-4" style={{ color: 'var(--tenant-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                    </div>
                    <h2 className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-[var(--tenant-text)] truncate">Global Event Feed</h2>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 pl-2">
                    <span className="relative flex h-2 w-2">
                        {isConnected ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        )}
                    </span>
                    <span className="text-[8px] md:text-[9px] font-mono uppercase tracking-widest hidden sm:inline-block" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>
                        {isConnected ? 'Uplink Stable' : 'Connecting...'}
                    </span>
                </div>
            </div>

            {/* Echo Ledger (Scrollable Area) */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 relative z-10 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isLoadingHistory ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <svg className="animate-spin w-5 h-5 md:w-6 md:h-6 mb-2 md:mb-3 opacity-50" style={{ color: 'var(--tenant-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--tenant-text)', opacity: 0.6 }}>Synchronizing Ledger...</p>
                    </div>
                ) : echos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-50" style={{ color: 'var(--tenant-text)' }}>
                        <svg className="w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="text-[9px] md:text-[11px] uppercase tracking-widest font-bold">The Abyss is silent.</p>
                        <p className="text-[10px] md:text-xs mt-1">Be the first to cast an echo.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {echos.map((echo, idx) => (
                            <motion.div
                                key={echo.id || idx}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                className={`flex flex-col max-w-[90%] md:max-w-[85%] ${echo.guest_id === guestId ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                            >
                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest mb-1 px-1" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>{echo.sender_name}</span>
                                <div 
                                    className="px-4 py-2.5 md:px-5 md:py-3 text-sm leading-relaxed backdrop-blur-md shadow-sm border"
                                    style={{
                                        color: 'var(--tenant-text)',
                                        backgroundColor: echo.guest_id === guestId ? 'color-mix(in srgb, var(--tenant-primary) 15%, transparent)' : 'rgba(255,255,255,0.03)',
                                        borderColor: echo.guest_id === guestId ? 'color-mix(in srgb, var(--tenant-primary) 30%, transparent)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '16px',
                                        borderTopRightRadius: echo.guest_id === guestId ? '4px' : '16px',
                                        borderTopLeftRadius: echo.guest_id === guestId ? '16px' : '4px',
                                    }}
                                >
                                    {echo.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Input Gateway */}
            <div className="p-3 md:p-4 border-t border-white/[0.05] relative z-10 bg-black/20">
                <form onSubmit={handleSendEcho} className="relative flex items-center w-full">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Cast an echo..."
                        disabled={!isConnected || isSending}
                        // [Architecture] Mobile UI: text-[16px] prevents iOS Zoom
                        className="w-full bg-black/40 border border-white/[0.1] py-3 md:py-3.5 pl-4 md:pl-6 pr-12 md:pr-14 text-[16px] md:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] transition-all disabled:opacity-50"
                        style={{ color: 'var(--tenant-text)', borderRadius: 'var(--tenant-btn-radius)' }}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || !isConnected || isSending}
                        className="absolute right-1.5 md:right-2 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        style={{ backgroundColor: 'var(--tenant-text)', color: 'var(--tenant-bg)', borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        {isSending ? (
                            <svg className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
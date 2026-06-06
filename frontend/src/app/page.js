"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPublicEvents } from '../services/api';
import Image from 'next/image';

const EncryptedText = dynamic(
    () => import('@/components/ui/encrypted-text').then((mod) => mod.EncryptedText),
    { ssr: false }
);

// [Architecture] Client-Side Mobile Detector
// Hydration-safe hook to isolate heavy animations from mobile devices
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    return isMobile;
};

// ARCHITECTURE: Global Ambient Aurora Background
// [Architecture] Mobile UI: Aggressive GPU optimization. Renders deep static gradient on mobile to save battery and guarantee 60fps scrolling.
const AmbientAurora = ({ isMobile }) => {
    if (isMobile) {
        return (
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#09090b] to-[#09090b]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-fuchsia-900/10 via-transparent to-transparent"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
                animate={{ x: [0, 100, -50, 0], y: [0, -50, 100, 0], scale: [1, 1.1, 0.9, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px]"
            />
            <motion.div
                animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.9, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-violet-500/10 blur-[120px]"
            />
            <motion.div
                animate={{ x: [0, 50, -100, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-500/10 blur-[120px]"
            />
        </div>
    );
};

// ARCHITECTURE: Cinematic Image Slideshow Component (Desynchronized & Optimized)
const EventSlideshow = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length <= 1) return;
        
        let intervalTimer;
        // Generate a random delay between 0 and 4 seconds for organic desynchronization
        const randomOffset = Math.random() * 4000;

        const startSlideshow = () => {
            intervalTimer = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, 8000); // Luxurious 8-second cycle
        };

        const initialDelay = setTimeout(startSlideshow, randomOffset);
        
        return () => {
            clearTimeout(initialDelay);
            if (intervalTimer) clearInterval(intervalTimer);
        };
    }, [images]);

    if (!images || images.length === 0) return null;

    return (
        <div 
            className="absolute inset-y-0 right-0 w-[70%] sm:w-[60%] z-0 pointer-events-none overflow-hidden rounded-r-[24px] opacity-40 group-hover:opacity-70 transition-opacity duration-700"
            style={{
                maskImage: 'linear-gradient(to right, transparent, black 40%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)'
            }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: 1, scale: 1.05 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                        opacity: { duration: 2, ease: "easeInOut" }, // 2-second ultra-smooth crossfade
                        scale: { duration: 12, ease: "linear" } // 12-second constant movement to outlast the 8s interval
                    }}
                    className="absolute inset-0"
                >
                    <Image 
                        src={images[currentIndex]} 
                        alt="Event Atmosphere" 
                        fill
                        priority={currentIndex === 0} 
                        sizes="(max-width: 768px) 100vw, 50vw" 
                        className="object-cover object-center"
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default function GlobalPlatformHub() {
    const context = '[Global Platform Hub]';
    const isMobile = useIsMobile();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadEvents = async () => {
            console.log(`${context} Step 1: Initializing ledger connection for event resolution...`);
            try {
                const fetchedEvents = await fetchPublicEvents();
                setEvents(fetchedEvents);
                setError(null);
                console.log(`${context} Step 2: Global events successfully hydrated.`);
            } catch (err) {
                console.error(`${context} Failure Point Hub-Fetch: Failed to load events:`, err);
                setError('Unable to connect to the global ledger.');
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, []);

    const filteredEvents = events.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        event.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredNodes = filteredEvents.slice(0, 5);
    const ledgerNodes = filteredEvents.slice(5);

    const formatLedgerDate = (dateString) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const nodeConfigs = [
        { pos: '-top-32 -right-32', bg: 'bg-indigo-500/15', duration: '7s', holo: 'via-indigo-400/20', shadow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]' },
        { pos: '-bottom-32 -left-32', bg: 'bg-violet-500/10', duration: '5s', holo: 'via-violet-400/20', shadow: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
        { pos: '-top-32 -left-32', bg: 'bg-fuchsia-500/10', duration: '8s', holo: 'via-fuchsia-400/20', shadow: 'hover:shadow-[0_0_30px_rgba(217,70,239,0.15)]' },
        { pos: '-bottom-32 -right-32', bg: 'bg-blue-500/10', duration: '6s', holo: 'via-blue-400/20', shadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
        { pos: 'top-0 right-1/4', bg: 'bg-indigo-500/10', duration: '9s', holo: 'via-indigo-400/20', shadow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]' }
    ];

    const staggerContainer = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <main className="min-h-screen flex flex-col items-center text-zinc-200 relative selection:bg-indigo-500/30 overflow-hidden bg-[#09090b]">
            
            <AmbientAurora isMobile={isMobile} />
            
            {/* [Architecture] Mobile UI: Split header into two rows on mobile to preserve layout integrity */}
            <header className="w-full max-w-7xl flex flex-col md:flex-row justify-between px-4 md:px-6 py-4 md:py-6 z-20 gap-4 md:gap-0">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-[10px] tracking-tighter">
                            NX
                        </div>
                        <span className="font-semibold text-zinc-100 tracking-[0.2em] text-[10px] md:text-xs uppercase">
                            Nexus
                        </span>
                    </div>
                    {/* Mobile Vault Button */}
                    <Link 
                        href="/admin/login" 
                        className="md:hidden flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors bg-white/[0.02] active:bg-white/[0.06] border border-white/[0.05] px-4 py-2.5 rounded-full backdrop-blur-md"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                        Vault
                    </Link>
                </div>

                <div className="w-full md:flex-1 md:max-w-md md:mx-6 relative group">
                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {/* [Architecture] Mobile UI: Prevent iOS zoom with text-[16px] */}
                    <input 
                        type="text" 
                        placeholder="Search active tenants..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] focus:border-indigo-500/30 focus:bg-white/[0.04] text-zinc-200 placeholder-zinc-600 text-[16px] md:text-sm rounded-full py-3 pl-12 pr-6 outline-none transition-all duration-300 backdrop-blur-md"
                    />
                </div>

                {/* Desktop Vault Button */}
                <Link 
                    href="/admin/login" 
                    className="hidden md:flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] px-5 py-3 rounded-full backdrop-blur-md"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                    <span>Vault Access</span>
                </Link>
            </header>

            <div className="max-w-7xl w-full z-10 flex flex-col items-center pb-12 pt-10 md:pt-24 md:px-6 flex-grow">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-12 md:mb-24 space-y-4 md:space-y-6 px-4 md:px-0"
                >
                    {/* [Architecture] Mobile UI: Clamp hero text down from 7xl to 4xl on phones */}
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight leading-tight min-h-[1.2em]">
                        <EncryptedText
                            text="Global Event Ledger"
                            encryptedClassName="text-zinc-600 font-mono tracking-normal"
                            revealedClassName="text-white"
                            revealDelayMs={50} 
                        />
                    </h1>
                    <p className="text-xs md:text-base text-zinc-500 max-w-sm md:max-w-xl mx-auto font-normal leading-relaxed tracking-wide">
                        Secure, multi-tenant state management for enterprise conferences, global exhibitions, and exclusive summits.
                    </p>
                </motion.div>

                <div className="w-full mb-12 flex flex-col">
                    <div className="w-full flex-grow flex flex-col min-h-[300px]">
                        {loading ? (
                            <div className="flex-grow flex flex-col items-center justify-center py-20">
                                <svg className="animate-spin h-6 w-6 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : error ? (
                            <div className="px-6 py-4 bg-rose-500/5 border border-rose-500/10 rounded-[32px] text-rose-400/80 text-xs font-medium tracking-wide text-center mx-4">
                                {error}
                            </div>
                        ) : (
                            <motion.div 
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="w-full flex flex-col gap-12 md:gap-16"
                            >
                                {/* 1. Command Center: Holographic Bento Grid (Desktop) / Snap Carousel (Mobile) */}
                                {featuredNodes.length > 0 && (
                                    <motion.div 
                                        layout 
                                        // [Architecture] Mobile UI: Horizontal App Store-style Snap Scroll fallback
                                        className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-4 md:gap-6 w-full md:auto-rows-[minmax(180px,auto)] pb-8 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for clean aesthetic
                                    >
                                        <style jsx>{`
                                            div::-webkit-scrollbar { display: none; }
                                        `}</style>
                                        <AnimatePresence mode="popLayout">
                                            {featuredNodes.map((event, index) => {
                                                const isAlpha = index === 0;
                                                const config = nodeConfigs[index] || nodeConfigs[0];
                                                
                                                // Desktop Spans
                                                let spanClass = 'md:col-span-1 md:row-span-1 md:min-h-[180px]';
                                                if (index === 0) spanClass = 'md:col-span-2 md:row-span-2 md:min-h-[320px]';
                                                if (index === 4) spanClass = 'md:col-span-2 md:row-span-1 md:min-h-[180px]';

                                                // Mobile Snap Card Sizing
                                                const mobileClass = "min-w-[85vw] min-h-[250px] snap-center flex-shrink-0 md:min-w-0 md:snap-align-none md:flex-shrink";

                                                const hasImages = event.images && event.images.length > 0;
                                                
                                                const cardBgClass = hasImages ? 'bg-[#0a0a0c]' : 'bg-white/[0.02] backdrop-blur-xl';
                                                const titleClass = hasImages ? 'text-white drop-shadow-md' : 'text-zinc-100 md:group-hover:text-white transition-colors';
                                                const descClass = hasImages ? 'text-zinc-400 drop-shadow-md' : 'text-zinc-500';
                                                
                                                const pillBgClass = hasImages ? 'bg-white/[0.04] shadow-sm' : 'bg-white/[0.02]';
                                                const pillTextClass = hasImages ? 'text-zinc-300' : 'text-zinc-400';
                                                const pillIconClass = hasImages ? 'text-zinc-400' : 'text-zinc-500';
                                                
                                                const buttonClass = hasImages 
                                                    ? 'bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95' 
                                                    : 'bg-white/[0.03] md:hover:bg-white/[0.1] text-zinc-300 hover:text-white active:scale-95';

                                                return (
                                                    <motion.div 
                                                        key={event.slug} 
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.3 }}
                                                        className={`group relative overflow-hidden border border-white/[0.05] rounded-[32px] p-6 md:p-8 flex flex-col transition-all duration-300 ease-out md:hover:-translate-y-1 ${cardBgClass} ${config.shadow} ${spanClass} ${mobileClass}`}
                                                    >
                                                        {hasImages && <EventSlideshow images={event.images} />}

                                                        {!hasImages && !isMobile && (
                                                            <>
                                                                <div className={`absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent ${config.holo} to-transparent -skew-x-[30deg] opacity-0 group-hover:opacity-100 group-hover:translate-x-[200%] transition-all duration-300 ease-out z-0 pointer-events-none`} />
                                                                <div 
                                                                    className={`absolute ${config.pos} w-96 h-96 ${config.bg} rounded-full blur-[100px] animate-pulse pointer-events-none transition-opacity duration-300 ease-out opacity-50 group-hover:opacity-100 z-0`} 
                                                                    style={{ animationDuration: config.duration }} 
                                                                />
                                                            </>
                                                        )}
                                                        
                                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-6 relative z-10">
                                                            <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-full border border-white/[0.05] backdrop-blur-md ${pillBgClass}`}>
                                                                <svg className={`w-3 h-3 md:w-3.5 md:h-3.5 ${pillIconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                                                                <span className={`${pillTextClass} text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em]`}>
                                                                    {formatLedgerDate(event.start_date)}
                                                                </span>
                                                            </div>
                                                            
                                                            {event.location && (
                                                                <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-full border border-white/[0.05] backdrop-blur-md ${pillBgClass}`}>
                                                                    <svg className={`w-3 h-3 md:w-3.5 md:h-3.5 ${pillIconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                    <span className={`${pillTextClass} text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] truncate max-w-[120px] md:max-w-[150px]`}>
                                                                        {event.location}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="mt-auto relative z-10 flex flex-col gap-2 md:gap-3">
                                                            {/* Architecture: Enforce larger text on mobile regardless of alpha status to fit the large snap-card */}
                                                            <h3 className={`${isAlpha ? 'text-2xl md:text-4xl font-light tracking-tight' : 'text-xl md:text-2xl font-light'} leading-tight ${titleClass}`}>
                                                                {event.title}
                                                            </h3>
                                                            
                                                            {(isAlpha || isMobile) && (
                                                                <p className={`text-xs md:text-sm leading-relaxed line-clamp-2 mb-1 md:mb-2 ${descClass}`}>
                                                                    {event.desc || 'No configuration data provided for this tenant.'}
                                                                </p>
                                                            )}
                                                            
                                                            <Link 
                                                                href={`/${event.slug}`} 
                                                                className={`w-fit py-2.5 md:py-3 px-5 md:px-6 rounded-full text-[9px] md:text-[10px] font-bold tracking-[0.2em] transition-all duration-300 ease-out uppercase flex items-center gap-2 md:gap-3 mt-1 md:mt-2 ${buttonClass}`}
                                                            >
                                                                <span>Access Node</span>
                                                                <svg className="w-3.5 h-3.5 md:group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {/* 2. Master Ledger CTA Button */}
                                {ledgerNodes.length > 0 && (
                                    <motion.div layout className="w-full flex justify-center mt-2 md:mt-8 relative z-20 px-4 md:px-0">
                                        <Link 
                                            href="/ledger" 
                                            className="group relative w-full md:w-auto flex justify-center items-center gap-3 px-8 py-4 bg-white/[0.03] md:hover:bg-white/[0.08] border border-white/[0.1] md:hover:border-indigo-500/50 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-zinc-300 hover:text-white transition-all duration-300 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] md:hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] active:scale-95"
                                        >
                                            <span>Access Extended Ledger</span>
                                            <svg className="w-4 h-4 md:group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </Link>
                                    </motion.div>
                                )}
                                
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
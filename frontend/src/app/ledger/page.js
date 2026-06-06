"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPublicEvents } from '../../services/api';

// [Architecture] Reusing the Centralized Ambient Aurora Component
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';

// [Architecture] Cinematic Image Slideshow Component for Ledger Rows
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
            className="absolute inset-y-0 right-0 w-[70%] sm:w-[50%] z-0 pointer-events-none overflow-hidden rounded-r-[24px] opacity-30 group-hover:opacity-60 transition-opacity duration-700"
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
                        opacity: { duration: 2, ease: "easeInOut" }, 
                        scale: { duration: 12, ease: "linear" } 
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

export default function ExtendedLedger() {
    const context = '[Extended Ledger]';
    
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
                console.error(`${context} Failure Point Ledger-Fetch: Failed to load events:`, err);
                setError('Unable to connect to the global ledger.');
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, []);

    const filteredEvents = events.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        event.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatLedgerDate = (dateString) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const ledgerColors = [
        { border: 'hover:border-l-indigo-500', sweep: 'from-indigo-500/[0.05]', text: 'group-hover:text-indigo-400' },
        { border: 'hover:border-l-violet-500', sweep: 'from-violet-500/[0.05]', text: 'group-hover:text-violet-400' },
        { border: 'hover:border-l-fuchsia-500', sweep: 'from-fuchsia-500/[0.05]', text: 'group-hover:text-fuchsia-400' },
        { border: 'hover:border-l-blue-500', sweep: 'from-blue-500/[0.05]', text: 'group-hover:text-blue-400' },
        { border: 'hover:border-l-emerald-500', sweep: 'from-emerald-500/[0.05]', text: 'group-hover:text-emerald-400' },
        { border: 'hover:border-l-cyan-500', sweep: 'from-cyan-500/[0.05]', text: 'group-hover:text-cyan-400' },
    ];

    const staggerContainer = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    return (
        <main className="min-h-screen flex flex-col items-center text-zinc-200 relative selection:bg-indigo-500/30 overflow-hidden bg-[#09090b]">
            <AmbientAurora />
            <InteractiveAura />

            {/* [Architecture] Master Navigation Header */}
            <header className="w-full max-w-6xl flex items-center justify-between px-6 py-8 z-20 border-b border-white/[0.02]">
                <div className="flex items-center gap-6">
                    <Link href="/" className="w-10 h-10 rounded-full bg-white/[0.03] hover:bg-white text-zinc-400 hover:text-black flex items-center justify-center transition-all border border-white/[0.05] shadow-inner group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-light text-white tracking-tight mb-1">Extended Ledger</h1>
                        <p className="text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase hidden sm:block">Complete Event Registry</p>
                    </div>
                </div>

                <div className="flex-1 max-w-sm mx-6 relative hidden md:block group">
                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Filter ledger..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] focus:border-indigo-500/30 focus:bg-white/[0.04] text-zinc-200 placeholder-zinc-600 text-xs rounded-full py-2.5 pl-11 pr-5 outline-none transition-all duration-300 backdrop-blur-md"
                    />
                </div>
            </header>

            <div className="max-w-6xl w-full z-10 flex flex-col items-center pb-24 pt-8 px-6 flex-grow">
                {/* Mobile Search */}
                <div className="w-full relative md:hidden mb-8 group">
                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search active tenants..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-indigo-500/30 text-zinc-200 placeholder-zinc-600 text-sm rounded-full py-3 pl-12 pr-6 outline-none backdrop-blur-md"
                    />
                </div>

                <div className="w-full flex-grow flex flex-col min-h-[400px]">
                    {loading ? (
                        <div className="flex-grow flex flex-col items-center justify-center py-20">
                            <svg className="animate-spin h-6 w-6 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Querying Master Ledger</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-[32px] text-rose-400/80 text-sm font-medium tracking-wide text-center">
                            {error}
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/[0.05] rounded-[32px] bg-white/[0.01]">
                            <span className="text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">No Nodes Found Matching Query</span>
                        </div>
                    ) : (
                        <motion.div 
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                            className="flex flex-col gap-4 w-full"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredEvents.map((event, index) => {
                                    const colorConfig = ledgerColors[index % ledgerColors.length];
                                    const hasImages = event.images && event.images.length > 0;
                                    const rowBgClass = hasImages ? 'bg-[#0a0a0c]' : 'bg-white/[0.01] hover:bg-white/[0.03]';

                                    return (
                                        <motion.div 
                                            key={event.slug}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                        >
                                            <Link 
                                                href={`/${event.slug}`}
                                                className={`group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 min-h-[120px] border border-white/[0.05] rounded-[24px] border-l-[3px] border-l-transparent ${colorConfig.border} transition-all duration-300 ease-out hover:shadow-[0_0_30px_rgba(255,255,255,0.02)] ${rowBgClass}`}
                                            >
                                                {hasImages && <EventSlideshow images={event.images} />}

                                                {!hasImages && (
                                                    <div className={`absolute inset-0 bg-gradient-to-r ${colorConfig.sweep} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none`} />
                                                )}
                                                
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-grow relative z-10">
                                                    <div className="w-32 shrink-0">
                                                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border backdrop-blur-md ${hasImages ? 'bg-white/[0.04] border-white/[0.05] text-zinc-300' : 'bg-white/[0.02] border-white/[0.05] text-zinc-500'}`}>
                                                            {formatLedgerDate(event.start_date)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-2 flex-grow">
                                                        <span className={`text-xl font-medium tracking-wide transition-colors ${hasImages ? 'text-white drop-shadow-md' : 'text-zinc-200 group-hover:text-white'}`}>
                                                            {event.title}
                                                        </span>
                                                        {event.location && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <svg className={`w-3.5 h-3.5 ${hasImages ? 'text-zinc-400' : 'text-zinc-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${hasImages ? 'text-zinc-300 drop-shadow-sm' : 'text-zinc-500'}`}>
                                                                    {event.location}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-6 sm:mt-0 flex items-center gap-4 sm:gap-6 relative z-10 shrink-0">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-inner ${hasImages ? 'bg-white/[0.08] group-hover:bg-white/[0.2] border border-white/[0.15] text-white' : `bg-white/[0.05] group-hover:bg-white/[0.15] border border-white/[0.1] ${colorConfig.text}`}`}>
                                                        <svg className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>
        </main>
    );
}
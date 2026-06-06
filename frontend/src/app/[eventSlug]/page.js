"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { fetchEventDetails } from '../../services/api';

const EncryptedText = dynamic(
    () => import('@/components/ui/encrypted-text').then((mod) => mod.EncryptedText),
    { ssr: false }
);

export default function EventHub() {
    const params = useParams();
    const eventSlug = params.eventSlug;
    
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const data = await fetchEventDetails(eventSlug);
                if (!data) throw new Error("Null payload returned from API.");
                setEvent(data);
                setError(null);
            } catch (err) {
                setError('Event node not found in the global ledger.');
            } finally {
                setLoading(false);
            }
        };
        if (eventSlug) loadEvent();
    }, [eventSlug]);

    const formatEventTime = (start, end) => {
        if (!start && !end) return null;
        const opts = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
        if (start && end) return `${new Date(start).toLocaleDateString('en-US', opts)} - ${new Date(end).toLocaleDateString('en-US', opts)}`;
        if (start) return new Date(start).toLocaleDateString('en-US', opts);
        if (end) return `Until ${new Date(end).toLocaleDateString('en-US', opts)}`;
    };

    if (loading) {
        return (
            <main className="flex flex-col items-center justify-center min-h-screen relative z-10 bg-transparent">
                <svg className="animate-spin h-6 w-6 text-[var(--tenant-text)] opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </main>
        );
    }

    if (error || !event) {
        return (
            <main className="flex flex-col items-center justify-center min-h-screen relative z-10 bg-transparent p-4">
                {/* [Architecture] Mobile UI: Responsive max-width clamping for error cards */}
                <div className="bg-black/40 border border-white/[0.05] p-6 lg:p-8 w-full max-w-[90%] lg:max-w-sm text-center backdrop-blur-xl shadow-2xl" style={{ borderRadius: 'var(--tenant-radius)' }}>
                    <h1 className="text-lg font-bold text-[var(--tenant-text)] mb-2">Access Denied</h1>
                    <p className="text-[var(--tenant-text)] opacity-60 text-xs mb-6">{error}</p>
                    <Link href="/" className="inline-flex py-3 px-6 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[var(--tenant-text)] font-bold text-[10px] uppercase tracking-widest transition-all w-full lg:w-auto justify-center" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                        Return to Ledger
                    </Link>
                </div>
            </main>
        );
    }

    const formattedDate = formatEventTime(event.start_date, event.end_date);

    if (event.is_expired) {
        return (
            <main className="flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-screen bg-transparent">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/[0.03] rounded-full filter blur-[150px] pointer-events-none z-0 transform-gpu"></div>
                {/* [Architecture] Mobile UI: Responsive max-width clamping for expired state */}
                <div 
                    className="bg-black/60 border border-white/[0.05] p-8 lg:p-12 w-full max-w-[95%] lg:max-w-md text-center backdrop-blur-2xl z-20 shadow-2xl relative"
                    style={{ borderRadius: 'var(--tenant-radius)' }}
                >
                    <h1 className="text-xl lg:text-2xl font-bold text-[var(--tenant-text)] mb-2 tracking-tight">Event Concluded</h1>
                    <p className="text-[var(--tenant-text)] opacity-60 text-xs lg:text-sm mb-8 leading-relaxed font-light">
                        The timeline for <span className="font-bold opacity-100">{event.title}</span> has officially elapsed. The registration portal and guest hub are now securely locked.
                    </p>
                    <Link 
                        href="/" 
                        className="inline-flex w-full justify-center py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-[var(--tenant-text)] font-bold text-[10px] uppercase tracking-widest transition-all"
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        Return to Global Directory
                    </Link>
                </div>
            </main>
        );
    }

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    return (
        <main className="flex flex-col items-center relative overflow-hidden min-h-screen bg-transparent">

            {/* [Architecture] Mobile UI: Header padding and text scaling */}
            <header className="w-full max-w-6xl flex items-center justify-between px-4 lg:px-6 py-4 lg:py-5 z-20 relative">
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-6 h-6 lg:w-7 lg:h-7 bg-[var(--tenant-text)] text-[var(--tenant-bg)] flex items-center justify-center font-bold text-[9px] lg:text-[10px] tracking-tighter" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                        NX
                    </div>
                    <span className="font-semibold text-[var(--tenant-text)] opacity-90 tracking-[0.2em] text-[10px] lg:text-xs uppercase drop-shadow-md">Nexus</span>
                </div>
                
                <Link 
                    href="/" 
                    className="flex items-center gap-1.5 lg:gap-2 text-[9px] lg:text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--tenant-text)] hover:opacity-80 transition-opacity bg-black/20 hover:bg-black/40 border border-white/10 px-3 py-1.5 lg:px-4 lg:py-2 backdrop-blur-md shadow-lg"
                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                >
                    <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    <span className="hidden sm:inline">Global</span> Directory
                </Link>
            </header>

            {/* [Architecture] Mobile UI: Structural vertical spacing adjusted for smaller viewports */}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-4xl w-full z-20 flex flex-col items-center pb-12 pt-8 lg:pt-16 px-4 relative">
                <motion.div variants={itemVariant} className="text-center mb-10 lg:mb-16 space-y-3 lg:space-y-4">
                    <div 
                        className="inline-flex items-center gap-2 mb-2 px-3 py-1.5 bg-black/20 backdrop-blur-md border border-white/10 text-[var(--tenant-text)] opacity-80 text-[9px] lg:text-[10px] font-bold tracking-[0.15em] uppercase shadow-lg"
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--tenant-primary)] animate-pulse shadow-[0_0_10px_var(--tenant-primary)]"></span>
                        Active Tenant Portal
                    </div>
                    
                    {/* [Architecture] Mobile UI: Severe typography clamp to prevent word breaks on iPhone SE sizes while preserving desktop scale */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--tenant-text)] leading-tight min-h-[1.2em] drop-shadow-xl px-2">
                        <EncryptedText text={event.title} encryptedClassName="opacity-50 font-mono tracking-normal" revealedClassName="text-[var(--tenant-text)]" revealDelayMs={50} />
                    </h1>
                    
                    <p className="text-xs lg:text-sm text-[var(--tenant-text)] opacity-60 max-w-sm lg:max-w-lg mx-auto font-normal leading-relaxed tracking-wide drop-shadow-md">
                        {event.desc || `Accessing dynamic data for the ${event.title} node.`}
                    </p>
                    
                    {(formattedDate || event.location) && (
                        /* [Architecture] Mobile UI: Flex pill tags expand to full width on extremely small screens for tap accuracy */
                        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-[var(--tenant-text)] opacity-90 mt-6 font-medium uppercase tracking-widest w-full sm:w-auto">
                            {formattedDate && (
                                <span className="flex items-center justify-center gap-2 px-4 py-2 bg-black/30 border border-white/10 shadow-lg backdrop-blur-md w-full sm:w-auto" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                    <svg className="w-3 h-3 text-[var(--tenant-primary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="truncate">{formattedDate}</span>
                                </span>
                            )}
                            {event.location && (
                                <span className="flex items-center justify-center gap-2 px-4 py-2 bg-black/30 border border-white/10 shadow-lg backdrop-blur-md w-full sm:w-auto" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                    <svg className="w-3 h-3 text-[var(--tenant-accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="truncate">{event.location}</span>
                                </span>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* [Architecture] Mobile UI: Stack grid on mobile, shift gap sizing. Desktop remains completely unchanged via lg: overrides. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full max-w-2xl">
                    <motion.div variants={itemVariant}>
                        <div 
                            className="group relative overflow-hidden bg-black/40 backdrop-blur-2xl border border-white/[0.08] p-6 lg:p-8 flex flex-col items-center text-center transition-all duration-300 ease-out lg:hover:-translate-y-1 h-full"
                            style={{ '--hover-shadow': 'var(--tenant-primary)', borderRadius: 'var(--tenant-radius)' }} 
                        >
                            <style jsx>{`@media (min-width: 1024px) { div.group:hover { box-shadow: 0 0 40px color-mix(in srgb, var(--hover-shadow) 20%, transparent); } }`}</style>
                            <div className="hidden lg:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[200%] transition-all duration-300 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 20%, transparent), transparent)' }} />
                            <div className="hidden lg:block absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300 ease-out opacity-50 group-hover:opacity-100 z-0 transform-gpu" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 10%, transparent)' }} />

                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/[0.05] flex items-center justify-center mb-4 lg:mb-6 border border-white/[0.1] relative z-10 shadow-inner" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-[var(--tenant-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                            </div>
                            <h2 className="text-lg lg:text-xl font-bold text-[var(--tenant-text)] mb-2 lg:mb-3 tracking-tight relative z-10 drop-shadow-md">Register</h2>
                            <p className="text-[var(--tenant-text)] opacity-60 text-[11px] lg:text-xs mb-6 lg:mb-8 flex-grow leading-relaxed relative z-10">Secure your clearance for this event. Submit your identity document for ledger verification.</p>
                            <Link href={`/${eventSlug}/register`} className="w-full py-3 lg:py-4 px-4 font-bold text-[10px] lg:text-[11px] uppercase tracking-wider transition-all relative z-10 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 text-[var(--tenant-bg)] lg:hover:opacity-90 flex justify-center items-center" style={{ backgroundColor: 'var(--tenant-text)', borderRadius: 'var(--tenant-btn-radius)' }}>
                                Start Registration
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariant}>
                        <div 
                            className="group relative overflow-hidden bg-black/40 backdrop-blur-2xl border border-white/[0.08] p-6 lg:p-8 flex flex-col items-center text-center transition-all duration-300 ease-out lg:hover:-translate-y-1 h-full"
                            style={{ '--hover-shadow': 'var(--tenant-accent)', borderRadius: 'var(--tenant-radius)' }}
                        >
                            <style jsx>{`@media (min-width: 1024px) { div.group:hover { box-shadow: 0 0 40px color-mix(in srgb, var(--hover-shadow) 20%, transparent); } }`}</style>
                            <div className="hidden lg:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[200%] transition-all duration-300 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-accent) 20%, transparent), transparent)' }} />
                            <div className="hidden lg:block absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300 ease-out opacity-50 group-hover:opacity-100 z-0 transform-gpu" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-accent) 10%, transparent)' }} />

                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/[0.05] flex items-center justify-center mb-4 lg:mb-6 border border-white/[0.1] relative z-10 shadow-inner" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-[var(--tenant-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                            <h2 className="text-lg lg:text-xl font-bold text-[var(--tenant-text)] mb-2 lg:mb-3 tracking-tight relative z-10 drop-shadow-md">Portal</h2>
                            <p className="text-[var(--tenant-text)] opacity-60 text-[11px] lg:text-xs mb-6 lg:mb-8 flex-grow leading-relaxed relative z-10">Already committed to the ledger? View your live verification state and event dashboard.</p>
                            <Link href={`/${eventSlug}/portal`} className="w-full py-3 lg:py-4 px-4 bg-white/[0.05] lg:hover:bg-white/[0.15] border border-white/[0.1] font-bold text-[10px] lg:text-[11px] uppercase tracking-wider transition-all relative z-10 active:scale-95 flex justify-center items-center" style={{ color: 'var(--tenant-text)', borderRadius: 'var(--tenant-btn-radius)' }}>
                                Enter Portal
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </main>
    );
}
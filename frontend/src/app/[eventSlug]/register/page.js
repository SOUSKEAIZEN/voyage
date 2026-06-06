"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GuestIntakeForm from '../../../components/GuestIntakeForm';

export default function RegisterPage() {
    const params = useParams();
    const eventSlug = params.eventSlug;
    const context = `[RegisterPage Component - ${eventSlug}]`;

    console.log(`${context} Rendering registration wrapper for event: ${eventSlug}`);

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    return (
        <main className="min-h-screen flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            
            <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="max-w-3xl mx-auto w-full z-10 relative flex flex-col items-center pt-8"
            >
                
                {/* Floating Navigation Pill */}
                <motion.div variants={itemVariant} className="mb-10 w-full flex justify-center">
                    <Link 
                        href={`/${eventSlug}`} 
                        className="inline-flex items-center text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--tenant-text)] opacity-70 hover:opacity-100 transition-opacity bg-black/20 px-4 py-2 border border-white/10 backdrop-blur-md shadow-lg"
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Return to Event Hub
                    </Link>
                </motion.div>

                {/* Minimalist Page Header */}
                <motion.div variants={itemVariant} className="text-center mb-10 space-y-4">
                    <div 
                        className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-black/20 border border-white/10 text-[var(--tenant-text)] opacity-90 text-[11px] font-medium tracking-[0.15em] uppercase backdrop-blur-md"
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--tenant-primary)] shadow-[0_0_8px_var(--tenant-primary)] animate-pulse"></span>
                        Secure Registration
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--tenant-text)] capitalize leading-tight drop-shadow-md">
                        {eventSlug.replace(/-/g, ' ')} Intake
                    </h1>
                    <p className="text-sm text-[var(--tenant-text)] opacity-60 max-w-xl mx-auto font-normal leading-relaxed tracking-wide drop-shadow-sm">
                        Submit your credentials for this event. All entries are verified before being committed to the multi-tenant ledger.
                    </p>
                </motion.div>

                {/* Form Wrapper with dynamic theming */}
                <motion.div variants={itemVariant} className="w-full">
                    <div 
                        className="group relative overflow-hidden w-full bg-black/40 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] border border-white/[0.08] p-4 sm:p-8 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                        style={{ borderRadius: 'var(--tenant-radius)' }}
                    >
                        
                        {/* ARCHITECTURE: Hardware-Accelerated Holographic Sweep */}
                        <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 15%, transparent), transparent)' }} />

                        <div className="relative z-10">
                            <GuestIntakeForm eventSlug={eventSlug} />
                        </div>
                    </div>
                </motion.div>
                
            </motion.div>
        </main>
    );
}
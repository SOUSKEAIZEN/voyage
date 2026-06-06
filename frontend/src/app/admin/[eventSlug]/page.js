"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link'; 
import { motion, AnimatePresence } from 'framer-motion';
import { getAllGuests, updateGuestState, fetchGuestDetails, fetchEventDetails } from '../../../services/api';
import { LumaDropdown } from '@/components/ui/luma-dropdown';
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';

export default function GuestLedgerDashboard() {
    const params = useParams();
    const eventSlug = params.eventSlug; 
    const context = `[Guest Ledger - ${eventSlug}]`;
    
    const router = useRouter();

    const [guests, setGuests] = useState([]);
    const [status, setStatus] = useState('loading'); 
    const [message, setMessage] = useState('');
    
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [inspectLoading, setInspectLoading] = useState(null); 
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalGuests, setTotalGuests] = useState(0);
    const [limit, setLimit] = useState(10);

    // [Architecture] State to track node archives and partial theming
    const [isArchived, setIsArchived] = useState(false);
    const [themeConfig, setThemeConfig] = useState({});

    const fetchLedger = useCallback(async (pageToFetch = currentPage, limitToFetch = limit) => {
        setStatus('loading');
        try {
            // First, fetch event details to check the Archive Lock & extract partial theme
            const eventData = await fetchEventDetails(eventSlug);
            setIsArchived(eventData.is_expired);
            setThemeConfig(eventData.theme_config || {});

            const result = await getAllGuests(eventSlug, pageToFetch, limitToFetch); 
            setGuests(result.data);
            setCurrentPage(result.pagination.currentPage);
            setTotalPages(result.pagination.totalPages);
            setTotalGuests(result.pagination.totalGuests);
            setStatus('success');
        } catch (error) {
            console.error(`${context} Failure Point T: UI failed to load ledger.`, error.message);
            setStatus('error');
            setMessage(error.message);

            const msg = error.message.toLowerCase();
            if (msg.includes('forbidden') || msg.includes('unauthorized') || msg.includes('session') || msg.includes('401') || msg.includes('403')) {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
            }
        }
    }, [currentPage, limit, router, eventSlug, context]);

    useEffect(() => {
        const validateGatekeeper = () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.warn(`${context} Access Denied: Cryptographic token missing. Redirecting to vault.`);
                router.push('/admin/login');
                return false;
            }
            return true;
        };

        if (validateGatekeeper()) {
            fetchLedger(1, 10); 
        }
    }, [fetchLedger, router, context]);

    const handleStateChange = async (guestId, newState) => {
        if (isArchived) {
            alert("This node is permanently archived. State mutations are locked.");
            return;
        }

        try {
            await updateGuestState(eventSlug, guestId, newState);
            fetchLedger(currentPage, limit); 
        } catch (error) {
            alert(`Failed to update state: ${error.message}`);
        }
    };

    const handleInspectGuest = async (guestId) => {
        setInspectLoading(guestId);
        try {
            const fullProfile = await fetchGuestDetails(eventSlug, guestId);
            setSelectedGuest(fullProfile);
        } catch (error) {
            alert(`Failed to retrieve extended details: ${error.message}`);
        } finally {
            setInspectLoading(null);
        }
    };

    const handleLockVault = () => {
        localStorage.removeItem('adminToken'); 
        router.push('/admin/login');
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) fetchLedger(currentPage + 1, limit);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) fetchLedger(currentPage - 1, limit);
    };

    const handleLimitChange = (newLimitValue) => {
        const newLimit = parseInt(newLimitValue);
        setLimit(newLimit);
        fetchLedger(1, newLimit); 
    };

    const renderStatusBadge = (state) => {
        switch(state) {
            case 0: return <span className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-zinc-600"></span> Invited</span>;
            case 1: return <span className="flex items-center gap-2 text-amber-400/80 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span> Submitted</span>;
            case 2: return <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span> Verified</span>;
            case -1: return <span className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-rose-500"></span> Action Req</span>;
            default: return <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">N/A</span>;
        }
    };

    const limitOptions = [
        { label: '10 Nodes', value: 10 },
        { label: '25 Nodes', value: 25 },
        { label: '50 Nodes', value: 50 }
    ];

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    // [Architecture] Partial Theming Injection
    // We intentionally ignore background, texture, and radius to maintain the clean Admin UI.
    const cssVariables = {
        '--tenant-primary': themeConfig.primary || '#06b6d4', // Defaults to Cyan
        '--tenant-accent': themeConfig.accent || '#3b82f6',
    };

    return (
        <main style={cssVariables} className="min-h-screen bg-[#09090b] flex flex-col items-center text-zinc-200 relative selection:bg-[var(--tenant-primary)]/30 overflow-hidden">
            
            <AmbientAurora />
            <InteractiveAura />

            <header className="w-full max-w-7xl flex items-center justify-between px-6 py-5 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-all">
                        <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-xs font-bold text-white tracking-[0.2em] uppercase">Ledger Explorer</h1>
                        <div className="flex items-center gap-2">
                            {/* [Architecture] Target text utilizes the Event Primary Color */}
                            <p className="text-[9px] text-[var(--tenant-primary)] font-mono tracking-widest uppercase font-bold drop-shadow-sm">Target: /{eventSlug}</p>
                            {isArchived && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">ARCHIVED</span>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleLockVault}
                    className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.05] px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/[0.06]"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                    Lock Vault
                </button>
            </header>

            <div className="max-w-7xl w-full z-10 flex flex-col px-6 pb-12 mt-6">
                
                {status === 'error' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-xs text-rose-400/80 tracking-wide">
                        {message}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {status === 'loading' ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-32"
                        >
                            <svg className="animate-spin h-5 w-5 text-[var(--tenant-primary)] opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="ledger"
                            variants={staggerContainer} 
                            initial="hidden" 
                            animate="show"
                        >
                            <motion.div variants={itemVariant} className={`bg-white/[0.01] backdrop-blur-xl rounded-[32px] border border-white/[0.05] shadow-2xl relative ${isArchived ? 'opacity-90' : ''}`}>
                                <div className="overflow-x-auto rounded-t-[32px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                                                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Guest Identity</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Contact Node</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Current State</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Timestamp</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Execution</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {guests.length === 0 ? (
                                                <tr><td colSpan="5" className="px-8 py-20 text-center text-zinc-600 italic text-xs">No records found in this environment node.</td></tr>
                                            ) : (
                                                guests.map((guest) => (
                                                    <tr key={guest.id} className="group hover:bg-white/[0.04] transition-colors duration-300">
                                                        <td className="px-8 py-5">
                                                            <div className="text-sm font-medium text-zinc-200">{guest.full_name}</div>
                                                            <div className="text-[10px] text-zinc-600 font-mono mt-1">{guest.id}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-xs text-zinc-400 font-medium">{guest.email}</td>
                                                        <td className="px-8 py-5">{renderStatusBadge(guest.current_state)}</td>
                                                        <td className="px-8 py-5 text-[10px] font-mono text-zinc-500 uppercase">
                                                            {new Date(guest.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className={`flex justify-end gap-2 transition-opacity ${isArchived ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                                                <button 
                                                                    onClick={() => handleInspectGuest(guest.id)}
                                                                    disabled={inspectLoading === guest.id}
                                                                    className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white hover:border-white/[0.1] text-[10px] font-bold uppercase transition-all"
                                                                >
                                                                    {inspectLoading === guest.id ? '...' : 'Inspect'}
                                                                </button>
                                                                
                                                                {/* ARCHITECTURE: Immutable Archive Lock - Hide state mutations if expired */}
                                                                {!isArchived && (
                                                                    <>
                                                                        <button onClick={() => handleStateChange(guest.id, 2)} className="px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-500/80 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold uppercase transition-all">Verify</button>
                                                                        <button onClick={() => handleStateChange(guest.id, -1)} className="px-3 py-1.5 rounded-full bg-rose-500/5 border border-rose-500/20 text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold uppercase transition-all">Reject</button>
                                                                        {guest.current_state !== 1 && (
                                                                            <button onClick={() => handleStateChange(guest.id, 1)} className="px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/20 text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase transition-all">Reset</button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {totalGuests > 0 && (
                                    <div className="px-8 py-6 flex items-center justify-between bg-white/[0.01] border-t border-white/[0.03]">
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                            Displaying <span className="text-[var(--tenant-primary)]">{((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, totalGuests)}</span> of {totalGuests} entries
                                        </div>
                                        <div className="flex items-center gap-6 relative z-50">
                                            <div className="flex items-center gap-3 w-40">
                                                <LumaDropdown 
                                                    value={limit}
                                                    onChange={handleLimitChange}
                                                    options={limitOptions}
                                                    direction="up"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={handlePrevPage} disabled={currentPage === 1} className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center disabled:opacity-30 hover:bg-white/[0.08] transition-all relative z-10">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <span className="text-[10px] font-mono text-zinc-500 uppercase">{currentPage} / {totalPages}</span>
                                                <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center disabled:opacity-30 hover:bg-white/[0.08] transition-all relative z-10">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {selectedGuest && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#09090b]/40 backdrop-blur-3xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-white/[0.02] border border-white/[0.08] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-xl overflow-hidden relative"
                        >
                            {/* [Architecture] The Modal Holographic Sweep now uses the Event's Primary Color */}
                            <div 
                                className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent -skew-x-[30deg] animate-[modalSweep_2s_ease-out_forwards] pointer-events-none z-0" 
                                style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 5%, transparent), transparent)' }}
                            />
                            
                            <div className="p-10 relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-2xl font-medium text-white tracking-tight">{selectedGuest.full_name}</h2>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-widest">Entry UID: <span className="text-[var(--tenant-primary)] drop-shadow-sm">{selectedGuest.id}</span></p>
                                    </div>
                                    <button onClick={() => setSelectedGuest(null)} className="w-10 h-10 flex items-center justify-center bg-white/[0.03] rounded-full text-zinc-500 hover:text-white border border-white/[0.05] transition-all hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8 p-6 bg-white/[0.02] rounded-[32px] border border-white/[0.05] shadow-inner">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Communication</span>
                                            <p className="text-xs text-zinc-200">{selectedGuest.email}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono">{selectedGuest.phone || 'No Node Recorded'}</p>
                                        </div>
                                        <div className="space-y-1 text-right flex flex-col items-end">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Verification State</span>
                                            <div className="mt-2">{renderStatusBadge(selectedGuest.current_state)}</div>
                                        </div>
                                    </div>

                                    <div className="px-2 space-y-4">
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Dietary Protocol</span>
                                            <p className="text-xs text-zinc-300 font-medium leading-relaxed">{selectedGuest.dietary_restrictions || 'No special requirements committed to node.'}</p>
                                        </div>

                                        <div className="pt-4 border-t border-white/[0.03]">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-3">Identity Proof</span>
                                            {selectedGuest.id_document_url ? (
                                                <a href={selectedGuest.id_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-widest uppercase transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                                                    Open Document Node
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            ) : (
                                                <p className="text-xs text-rose-500/70 font-medium italic">No proof of identity detected.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-10 py-6 bg-white/[0.01] border-t border-white/[0.05] flex justify-end relative z-10">
                                <button onClick={() => setSelectedGuest(null)} className="text-[10px] font-bold tracking-widest uppercase px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all">
                                    Close Inspection
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGuestStatus, fetchEventSchedule } from '../../../../services/api'; 
import { AbyssProvider, useAbyss } from '@/components/AbyssProvider';
import { GlobalFeed } from '@/components/portal/GlobalFeed';
import { GuestDirectory } from '@/components/portal/GuestDirectory';

function GuestDashboardInner() {
    const params = useParams();
    const eventSlug = params.eventSlug;
    const context = `[GuestDashboard Component - ${eventSlug}]`;
    
    const router = useRouter();
    const [guest, setGuest] = useState(null);
    const [scheduleNodes, setScheduleNodes] = useState([]);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'feed' | 'directory'
    
    const { socket, isConnected } = useAbyss();

    useEffect(() => {
        const token = localStorage.getItem(`guestToken_${eventSlug}`);
        const sessionData = sessionStorage.getItem('guestData');
        
        if (!token || !sessionData) {
            console.warn(`${context} Failure Point EE: Unauthorized access attempt or token missing. Redirecting to portal.`);
            sessionStorage.removeItem('guestData'); 
            router.push(`/${eventSlug}/portal`);
            return;
        }

        try {
            const parsedData = JSON.parse(sessionData);
            setGuest(parsedData); 

            const syncStatus = async () => {
                try {
                    const liveState = await fetchGuestStatus(eventSlug, parsedData.id);
                    if (liveState !== parsedData.current_state) {
                        const updatedGuest = { ...parsedData, current_state: liveState };
                        setGuest(updatedGuest);
                        sessionStorage.setItem('guestData', JSON.stringify(updatedGuest));
                    }
                } catch (error) {
                    console.warn(`${context} Background REST sync failed. Falling back to cached state.`);
                }
            };
            syncStatus();

            const loadSchedule = async () => {
                try {
                    const data = await fetchEventSchedule(eventSlug);
                    setScheduleNodes(data || []);
                } catch (error) {
                    console.error(`${context} Failed to fetch itinerary.`, error);
                } finally {
                    setIsLoadingSchedule(false);
                }
            };
            loadSchedule();

        } catch (error) {
            console.error(`${context} Failure Point FF: Corrupted session data.`, error);
            sessionStorage.removeItem('guestData');
            localStorage.removeItem(`guestToken_${eventSlug}`);
            router.push(`/${eventSlug}/portal`);
        }
    }, [router, eventSlug, context]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleStateUpgrade = (payload) => {
            if (payload.eventSlug === eventSlug) {
                setGuest(prevGuest => {
                    if (!prevGuest) return null;
                    const updatedGuest = { ...prevGuest, current_state: payload.newState };
                    sessionStorage.setItem('guestData', JSON.stringify(updatedGuest));
                    return updatedGuest;
                });
            }
        };

        socket.on('state_upgrade', handleStateUpgrade);

        return () => {
            socket.off('state_upgrade', handleStateUpgrade);
        };
    }, [socket, isConnected, eventSlug]);

    const handleLogout = () => {
        sessionStorage.removeItem('guestData');
        localStorage.removeItem(`guestToken_${eventSlug}`); 
        router.push(`/${eventSlug}/portal`);
    };

    if (!guest) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent relative overflow-hidden">
                <svg className="animate-spin h-6 w-6 relative z-10 text-[var(--tenant-text)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </main>
        );
    }

    const renderStatusBadge = (state) => {
        switch(state) {
            case 0: return <span className="px-3 py-1.5 sm:py-1 bg-zinc-800/50 text-[var(--tenant-text)] opacity-60 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-inner text-center" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>Invited</span>;
            case 1: return <span className="px-3 py-1.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-inner text-center" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-accent) 20%, transparent)', color: 'var(--tenant-accent)', border: '1px solid color-mix(in srgb, var(--tenant-accent) 40%, transparent)', borderRadius: 'var(--tenant-btn-radius)' }}>Pending Review</span>;
            case 2: return <span className="px-3 py-1.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_color-mix(in_srgb,var(--tenant-primary)_30%,transparent)] text-center" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 20%, transparent)', color: 'var(--tenant-primary)', border: '1px solid color-mix(in srgb, var(--tenant-primary) 40%, transparent)', borderRadius: 'var(--tenant-btn-radius)' }}>Verified Access</span>;
            case -1: return <span className="px-3 py-1.5 sm:py-1 bg-rose-500/10 text-rose-400 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-rose-500/20 shadow-inner text-center" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>Action Required</span>;
            default: return <span className="px-3 py-1.5 sm:py-1 bg-zinc-800/50 text-[var(--tenant-text)] opacity-60 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-inner text-center" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>Unknown</span>;
        }
    };

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    return (
        <main className="min-h-screen bg-transparent flex flex-col items-center text-[var(--tenant-text)] relative selection:bg-[var(--tenant-primary)]/30 overflow-hidden">

            <header className="w-full max-w-6xl flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 z-20">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[var(--tenant-text)] text-[var(--tenant-bg)] flex items-center justify-center font-bold text-[9px] sm:text-[10px] tracking-tighter" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                        NX
                    </div>
                    <span className="font-semibold text-[var(--tenant-text)] opacity-90 tracking-[0.2em] text-[10px] sm:text-xs uppercase hidden sm:block">Nexus</span>
                </div>
                
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--tenant-text)] opacity-60 hover:opacity-100 transition-colors bg-white/[0.02] border border-white/[0.05] px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md hover:bg-white/[0.06]"
                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="hidden sm:inline">Secure</span> Logout
                </button>
            </header>

            <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="max-w-4xl w-full z-10 flex flex-col items-center pb-12 pt-2 sm:pt-4 px-4 sm:px-6"
            >
                <motion.div variants={itemVariant} className="w-full text-left mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            {/* [Architecture] Mobile UI: Stepped down text sizes to prevent wrapping issues on long names */}
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-[var(--tenant-text)] tracking-tight mb-1.5 sm:mb-2">Welcome back, {guest.full_name.split(' ')[0]}</h1>
                            <p className="text-xs sm:text-sm text-[var(--tenant-text)] opacity-60 font-normal tracking-wide">Accessing your secure event node and credentials.</p>
                        </div>
                        <div className="flex sm:justify-end mt-1 sm:mt-0">
                            {renderStatusBadge(guest.current_state)}
                        </div>
                    </div>
                </motion.div>

                {/* ARCHITECTURE: Dynamic 3-Tab Controller */}
                {/* [Architecture] Mobile UI: Ensuring smooth horizontal scroll for tabs without visible scrollbars */}
                <motion.div variants={itemVariant} className="w-full flex justify-start mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="inline-flex bg-white/[0.02] border border-white/[0.05] p-1 backdrop-blur-md whitespace-nowrap min-w-max" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'dashboard' ? 'shadow-lg shadow-white/10' : 'opacity-60 hover:opacity-100 hover:bg-white/[0.03]'}`}
                            style={{ 
                                backgroundColor: activeTab === 'dashboard' ? 'var(--tenant-text)' : 'transparent',
                                color: activeTab === 'dashboard' ? 'var(--tenant-bg)' : 'var(--tenant-text)',
                                borderRadius: 'var(--tenant-btn-radius)'
                            }}
                        >
                            Identity Hub
                        </button>
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-1.5 sm:gap-2 ${activeTab === 'feed' ? 'shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/[0.03]'}`}
                            style={{ 
                                backgroundColor: activeTab === 'feed' ? 'var(--tenant-primary)' : 'transparent',
                                color: activeTab === 'feed' ? 'var(--tenant-bg)' : 'var(--tenant-text)',
                                borderRadius: 'var(--tenant-btn-radius)'
                            }}
                        >
                            Global Abyss
                            {isConnected && activeTab !== 'feed' && (
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--tenant-primary)' }}></span>
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('directory')}
                            className={`px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'directory' ? 'shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/[0.03]'}`}
                            style={{ 
                                backgroundColor: activeTab === 'directory' ? 'var(--tenant-accent)' : 'transparent',
                                color: activeTab === 'directory' ? 'var(--tenant-bg)' : 'var(--tenant-text)',
                                borderRadius: 'var(--tenant-btn-radius)'
                            }}
                        >
                            Direct Mesh
                        </button>
                    </div>
                </motion.div>

                {/* Tab Rendering Engine */}
                <div className="w-full relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && (
                            <motion.div 
                                key="tab-dashboard"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                {/* [Architecture] Mobile UI: Tighter grid gaps */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full mb-6">
                                    
                                    {/* Identity Node Card */}
                                    <div 
                                        className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-5 sm:p-8 transition-all duration-500 hover:-translate-y-1 lg:hover:[box-shadow:0_0_30px_color-mix(in_srgb,var(--tenant-primary)_15%,transparent)]"
                                        style={{ borderRadius: 'var(--tenant-radius)' }}
                                    >
                                        <div className="hidden lg:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-500 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 15%, transparent), transparent)' }} />
                                        
                                        {/* [Architecture] Mobile UI: Hidden GPU intensive blob on mobile */}
                                        <div className="hidden sm:block absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[100px] animate-pulse pointer-events-none transition-opacity duration-300 ease-out opacity-50 group-hover:opacity-100 z-0 transform-gpu" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 10%, transparent)', animationDuration: '6s' }} />

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/[0.08]" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--tenant-text)] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </div>
                                                <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-[var(--tenant-text)]">Identity Node</h2>
                                            </div>
                                            <div className="space-y-4 sm:space-y-6">
                                                <div>
                                                    <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>Secure ID</span>
                                                    {/* [Architecture] Mobile UI: Forced break-all to prevent horizontal scrolling on long UUIDs */}
                                                    <span className="font-mono text-[10px] sm:text-xs block bg-white/[0.03] p-2.5 sm:p-3 border border-white/[0.05] break-all" style={{ color: 'var(--tenant-text)', opacity: 0.8, borderRadius: 'var(--tenant-btn-radius)' }}>{guest.id}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>Government ID</span>
                                                    <a href={guest.id_document_url} target="_blank" rel="noopener noreferrer" className="text-[11px] sm:text-xs font-semibold hover:opacity-80 inline-flex items-center gap-1.5 sm:gap-2 transition-opacity w-fit" style={{ color: 'var(--tenant-text)', opacity: 0.8 }}>
                                                        Verify Submission
                                                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile Attributes Card */}
                                    <div 
                                        className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-5 sm:p-8 transition-all duration-500 hover:-translate-y-1 lg:hover:[box-shadow:0_0_30px_color-mix(in_srgb,var(--tenant-accent)_15%,transparent)]"
                                        style={{ borderRadius: 'var(--tenant-radius)' }}
                                    >
                                        <div className="hidden lg:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-500 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-accent) 15%, transparent), transparent)' }} />
                                        
                                        {/* [Architecture] Mobile UI: Hidden GPU intensive blob on mobile */}
                                        <div className="hidden sm:block absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] animate-pulse pointer-events-none transition-opacity duration-300 ease-out opacity-50 group-hover:opacity-100 z-0 transform-gpu" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-accent) 10%, transparent)', animationDuration: '7s' }} />

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/[0.08]" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--tenant-text)] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </div>
                                                <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-[var(--tenant-text)]">Profile Attributes</h2>
                                            </div>
                                            <div className="space-y-4 sm:space-y-6">
                                                <div className="flex justify-between items-center border-b border-white/[0.03] pb-3 sm:pb-4">
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>Network Contact</span>
                                                    <span className="text-[11px] sm:text-xs font-mono text-[var(--tenant-text)] opacity-80">{guest.phone || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 sm:gap-2">
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>Dietary Specs</span>
                                                    <span className="text-[11px] sm:text-xs font-medium leading-relaxed text-[var(--tenant-text)] opacity-80">{guest.dietary_restrictions || 'No restrictions committed to ledger.'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Event Itinerary Full-Width Card */}
                                <div 
                                    className="group relative overflow-hidden w-full bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] transition-all duration-500 lg:hover:shadow-[0_0_30px_color-mix(in_srgb,var(--tenant-primary)_8%,transparent)]"
                                    style={{ borderRadius: 'var(--tenant-radius)' }}
                                >
                                    <div className="hidden lg:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-primary) 10%, transparent), transparent)' }} />
                                    
                                    <div className="relative z-10">
                                        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-white/[0.03] flex justify-between items-center">
                                            <h2 className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[var(--tenant-text)] opacity-70">Event Itinerary</h2>
                                            <span className="text-[9px] sm:text-[10px] font-mono uppercase truncate ml-2" style={{ color: 'var(--tenant-text)', opacity: 0.4 }}>Hub: {eventSlug.replace(/-/g, ' ')}</span>
                                        </div>
                                        <div className="p-4 sm:p-8">
                                            {isLoadingSchedule ? (
                                                <div className="flex justify-center items-center py-6 sm:py-8">
                                                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 opacity-50 text-[var(--tenant-text)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                </div>
                                            ) : scheduleNodes.length === 0 ? (
                                                <div className="text-center py-6 sm:py-8">
                                                    <p className="text-xs sm:text-sm font-normal italic opacity-50 text-[var(--tenant-text)]">The node administrator has not injected a timeline yet.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 sm:space-y-4">
                                                    {scheduleNodes.map((node, idx) => (
                                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 p-3 sm:p-4 bg-white/[0.01] border border-white/[0.03] lg:hover:bg-white/[0.03] transition-colors group/node" style={{ borderRadius: 'var(--tenant-btn-radius)' }}>
                                                            <div className="w-full sm:w-32 flex-shrink-0 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start border-b sm:border-b-0 border-white/[0.05] pb-2 sm:pb-0 mb-1 sm:mb-0">
                                                                <p className="text-[11px] sm:text-xs font-mono font-bold transition-colors opacity-80 group-hover/node:opacity-100" style={{ color: 'var(--tenant-primary)' }}>
                                                                    {new Date(node.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                <p className="text-[9px] sm:text-[10px] font-mono opacity-50 sm:mt-1 text-[var(--tenant-text)]">
                                                                    {new Date(node.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-xs sm:text-sm font-bold text-[var(--tenant-text)]">{node.title}</h3>
                                                                {(node.speaker_name || node.location) && (
                                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                                                                        {node.speaker_name && (
                                                                            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tenant-text)', opacity: 0.5 }}>
                                                                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                                {node.speaker_name}
                                                                            </span>
                                                                        )}
                                                                        {node.speaker_name && node.location && <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />}
                                                                        {node.location && (
                                                                            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--tenant-accent)', opacity: 0.8 }}>
                                                                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                                {node.location}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {node.description && (
                                                                    <p className="text-[11px] sm:text-xs mt-2 sm:mt-3 leading-relaxed opacity-60 text-[var(--tenant-text)]">{node.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'feed' && (
                            <motion.div 
                                key="tab-feed"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <GlobalFeed eventSlug={eventSlug} guestId={guest.id} />
                            </motion.div>
                        )}

                        {activeTab === 'directory' && (
                            <motion.div 
                                key="tab-directory"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <GuestDirectory eventSlug={eventSlug} currentGuestId={guest.id} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </main>
    );
}

export default function GuestDashboard() {
    return (
        <AbyssProvider>
            <GuestDashboardInner />
        </AbyssProvider>
    );
}
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    fetchEventDetails, 
    updateEventDetails, 
    deleteEvent, 
    updateEventSchedule,
    fetchEventTelemetry,
    triggerMeshDissolve
} from '../../../../../services/api';
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';

// [Architecture] Curated MSaaS Theme Engine Presets (Dimensional)
const THEME_PRESETS = [
    { name: 'Abyssal Void', config: { background: '#09090b', text: '#ffffff', primary: '#8b5cf6', accent: '#3b82f6', fontFamily: 'sans', radius: 'full', texture: 'none' } },
    { name: 'Royal Crimson', config: { background: '#1a0a0c', text: '#fde68a', primary: '#e11d48', accent: '#d97706', fontFamily: 'serif', radius: 'sm', texture: 'grain' } },
    { name: 'Slaughterhouse', config: { background: '#050000', text: '#e5e5e5', primary: '#991b1b', accent: '#dc2626', fontFamily: 'mono', radius: 'none', texture: 'grain' } },
    { name: 'Tokyo Bubblegum', config: { background: '#2e1065', text: '#fdf4ff', primary: '#f472b6', accent: '#2dd4bf', fontFamily: 'sans', radius: 'full', texture: 'dots' } },
    { name: 'Neural Hack', config: { background: '#022c22', text: '#a7f3d0', primary: '#10b981', accent: '#34d399', fontFamily: 'mono', radius: 'none', texture: 'grid' } },
    { name: 'Mariana Trench', config: { background: '#082f49', text: '#e0f2fe', primary: '#0ea5e9', accent: '#06b6d4', fontFamily: 'sans', radius: 'sm', texture: 'none' } },
];

export default function EditEventDeployment() {
    const params = useParams();
    const currentEventSlug = params.eventSlug;
    const context = `[Event Edit Console - ${currentEventSlug}]`;
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        startDate: '',
        endDate: '',
        location: '',
        description: '',
        isPublic: true,
        images: [],
        customDomain: '',
        themeConfig: {
            background: '#09090b',
            text: '#ffffff',
            primary: '#8b5cf6',
            accent: '#3b82f6',
            fontFamily: 'sans',
            radius: 'full',
            texture: 'none'
        }
    });

    const [scheduleItems, setScheduleItems] = useState([]);
    const [newScheduleNode, setNewScheduleNode] = useState({ title: '', description: '', speaker_name: '', location: '', start_time: '', end_time: '' });

    const [telemetry, setTelemetry] = useState({ activeConnections: 0, totalRegisteredVerified: 0 });
    const [isConfirmingDissolve, setIsConfirmingDissolve] = useState(false);

    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [status, setStatus] = useState('loading'); 
    const [message, setMessage] = useState('');
    const [newSlug, setNewSlug] = useState('');
    
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const formatForInput = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return (new Date(date - tzOffset)).toISOString().slice(0, 16);
    };

    useEffect(() => {
        const validateGatekeeper = () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                router.push('/admin/login');
                return false;
            }
            return true;
        };

        const loadEventData = async () => {
            try {
                const data = await fetchEventDetails(currentEventSlug);

                if (data.is_expired) {
                    console.warn(`${context} Node is archived. Modifications strictly prohibited.`);
                    router.push(`/admin/${currentEventSlug}`); 
                    return;
                }
                
                // ARCHITECTURE: Mapping legacy DB payloads to new dimensional architecture
                setFormData({
                    name: data.title || '',
                    slug: data.slug || '',
                    startDate: formatForInput(data.start_date),
                    endDate: formatForInput(data.end_date),
                    location: data.location || '',
                    description: data.desc || '',
                    isPublic: data.is_public !== undefined ? data.is_public : true,
                    images: data.images || [],
                    customDomain: data.custom_domain || '',
                    themeConfig: {
                        background: data.theme_config?.background || '#09090b',
                        text: data.theme_config?.text || '#ffffff',
                        primary: data.theme_config?.primary || '#8b5cf6',
                        accent: data.theme_config?.accent || '#3b82f6',
                        fontFamily: data.theme_config?.fontFamily || 'sans',
                        radius: data.theme_config?.radius || 'full',
                        texture: data.theme_config?.texture || 'none'
                    }
                });

                if (data.schedule && Array.isArray(data.schedule)) {
                    const formattedSchedule = data.schedule.map(item => ({
                        ...item,
                        start_time: formatForInput(item.start_time),
                        end_time: formatForInput(item.end_time)
                    }));
                    setScheduleItems(formattedSchedule);
                }

                setStatus('idle');
            } catch (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('session') || msg.includes('unauthorized')) {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                    return;
                }
                setStatus('error');
                setMessage('Could not load event data. It may have been deleted.');
            }
        };

        if (validateGatekeeper()) loadEventData();
    }, [currentEventSlug, router, context]);

    useEffect(() => {
        if (status !== 'idle') return;
        const pollTelemetry = async () => {
            try {
                const data = await fetchEventTelemetry(currentEventSlug);
                setTelemetry(data);
            } catch (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('session') || msg.includes('unauthorized')) {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                }
            }
        };
        pollTelemetry();
        const intervalId = setInterval(pollTelemetry, 10000);
        return () => clearInterval(intervalId);
    }, [currentEventSlug, status, router]); 

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleThemeChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, themeConfig: { ...prev.themeConfig, [name]: value } }));
    };

    const handleDimensionalChange = (field, value) => {
        setFormData(prev => ({ ...prev, themeConfig: { ...prev.themeConfig, [field]: value } }));
    };

    const applyThemePreset = (presetConfig) => {
        setFormData(prev => ({ ...prev, themeConfig: { ...presetConfig } }));
    };

    const handleSlugChange = (e) => {
        const safeSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, slug: safeSlug });
    };

    const handleAddImage = (e) => {
        e.preventDefault();
        if (!currentImageUrl.trim()) return;
        if (!currentImageUrl.startsWith('http')) {
            alert('Please enter a valid hosted image URL starting with http:// or https://');
            return;
        }
        setFormData(prev => ({ ...prev, images: [...prev.images, currentImageUrl.trim()] }));
        setCurrentImageUrl('');
    };

    const handleRemoveImage = (indexToRemove) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, index) => index !== indexToRemove) }));
    };

    const handleNewScheduleChange = (e) => {
        const { name, value } = e.target;
        setNewScheduleNode(prev => ({ ...prev, [name]: value }));
    };

    const handleAddScheduleNode = () => {
        if (!newScheduleNode.title || !newScheduleNode.start_time || !newScheduleNode.end_time) {
            alert("Title, Start Time, and End Time are strictly required for temporal nodes.");
            return;
        }
        const nodeStart = new Date(newScheduleNode.start_time);
        const nodeEnd = new Date(newScheduleNode.end_time);

        if (nodeStart >= nodeEnd) {
            alert("Temporal paradox detected: Start Time must precede End Time.");
            return;
        }
        if (formData.startDate && nodeStart < new Date(formData.startDate)) {
            alert("Anomaly: Schedule node cannot begin before the Master Event start time.");
            return;
        }
        if (formData.endDate && nodeEnd > new Date(formData.endDate)) {
            alert("Anomaly: Schedule node cannot end after the Master Event end time.");
            return;
        }

        setScheduleItems([...scheduleItems, { ...newScheduleNode }]);
        setNewScheduleNode({ title: '', description: '', speaker_name: '', location: '', start_time: '', end_time: '' });
    };

    const handleRemoveScheduleNode = (indexToRemove) => {
        setScheduleItems(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleDissolveMesh = async () => {
        if (!isConfirmingDissolve) {
            setIsConfirmingDissolve(true);
            return;
        }
        setStatus('submitting');
        try {
            await triggerMeshDissolve(currentEventSlug);
            setStatus('success');
            setMessage(`The Ephemeral Mesh has been successfully dissolved.`);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to dissolve the mesh.');
            setIsConfirmingDissolve(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.slug) {
            setStatus('error');
            setMessage('Event Name and URL Slug are strictly required.');
            return;
        }
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
            setStatus('error');
            setMessage('The Start Time must be earlier than the End Time.');
            return;
        }

        setStatus('submitting');
        try {
            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
            };

            const result = await updateEventDetails(currentEventSlug, payload);
            
            const syncSchedule = scheduleItems.map(item => ({
                ...item,
                start_time: new Date(item.start_time).toISOString(),
                end_time: new Date(item.end_time).toISOString()
            }));
            
            await updateEventSchedule(currentEventSlug, syncSchedule);

            setNewSlug(result.data.slug);
            setStatus('success');
            setMessage(`Tenant "${formData.name}" and Itinerary have been successfully synchronized.`);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to update the event network.');
        }
    };

    const handlePurge = async () => {
        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            return;
        }
        setStatus('submitting');
        try {
            await deleteEvent(currentEventSlug);
            router.push('/admin'); 
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to purge the environment.');
            setIsConfirmingDelete(false);
        }
    };

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    if (status === 'loading') {
        return (
            <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 text-zinc-500 relative overflow-hidden">
                <AmbientAurora />
                <svg className="animate-spin h-6 w-6 mb-4 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </main>
        );
    }

    if (status === 'success') {
        return (
            <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-200 relative overflow-hidden">
                <AmbientAurora />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[40px] p-12 max-w-lg text-center shadow-2xl z-10 relative overflow-hidden group">
                    <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -skew-x-[30deg] animate-[modalSweep_2s_ease-out_forwards] pointer-events-none z-0" />
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h1 className="text-3xl font-medium text-white mb-4">Command Executed</h1>
                        <p className="text-zinc-500 mb-10 leading-relaxed text-sm tracking-wide">{message}</p>
                        <div className="flex flex-col gap-4">
                            <Link href={`/${newSlug || currentEventSlug}`} target="_blank" className="w-full py-4 px-6 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest transition-all hover:bg-zinc-200">View Live Hub</Link>
                            <Link href="/admin" className="w-full py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-zinc-300 rounded-full font-bold text-xs uppercase tracking-widest transition-all">Return to Control Plane</Link>
                        </div>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#09090b] flex flex-col items-center text-zinc-200 relative selection:bg-cyan-500/30 overflow-hidden">
            <AmbientAurora />
            <InteractiveAura />
            <header className="w-full max-w-7xl flex items-center justify-between px-6 py-5 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-all">
                        <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-xs font-bold text-white tracking-[0.2em] uppercase">Edit Configuration</h1>
                        <p className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">Target: /{currentEventSlug}</p>
                    </div>
                </div>
            </header>

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-5xl w-full z-10 relative px-6 pb-16 pt-4">
                <motion.div variants={itemVariant} className="bg-white/[0.01] backdrop-blur-xl rounded-[40px] border border-white/[0.05] overflow-hidden shadow-2xl relative group transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                    <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -skew-x-[30deg] opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out z-0 pointer-events-none" />

                    <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8 relative z-10">
                        <div className="p-6 rounded-[24px] border border-amber-500/20 bg-amber-500/5 shadow-inner flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                                        <span className="relative text-3xl font-mono text-white tracking-tighter">{telemetry.activeConnections}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Live Sockets</span>
                                </div>
                                <div className="h-8 w-[1px] bg-white/[0.1]"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xl font-mono text-zinc-300 tracking-tighter">{telemetry.totalRegisteredVerified}</span>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Verified Guests</span>
                                </div>
                            </div>
                            <button type="button" onClick={handleDissolveMesh} className={`px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${isConfirmingDissolve ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse' : 'bg-transparent border border-amber-500/30 text-amber-500 hover:bg-amber-500/10'}`}>
                                {isConfirmingDissolve ? 'Confirm Dissolve' : 'Dissolve Mesh'}
                            </button>
                        </div>

                        {status === 'error' && (
                            <div className="p-4 bg-rose-500/5 border border-rose-500/10 text-rose-400/80 text-xs font-medium rounded-2xl tracking-wide">{message}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Event Title</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-6 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-sm placeholder-zinc-700 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">URL Slug</label>
                                    <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-full overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/30 transition-all shadow-inner">
                                        <span className="flex items-center pl-6 pr-2 text-zinc-600 text-[10px] font-mono uppercase tracking-tight">node/</span>
                                        <input type="text" name="slug" value={formData.slug} onChange={handleSlugChange} required className="w-full bg-transparent text-white px-0 py-4 focus:outline-none font-mono text-sm" />
                                    </div>
                                    <p className="text-[10px] text-amber-500/60 ml-4 italic">Changing this will break established network paths.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Start Time</label>
                                        <input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-xs shadow-inner [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">End Time</label>
                                        <input type="datetime-local" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-xs shadow-inner [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Location</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-6 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-sm shadow-inner" />
                                </div>
                                <div className="space-y-2 h-[calc(100%-84px)]">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full h-full min-h-[120px] bg-white/[0.02] border border-white/[0.05] text-white rounded-[32px] px-6 py-5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-sm resize-none shadow-inner" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-white/[0.03]">
                            <div className="flex justify-between items-end ml-2 mb-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Temporal Itinerary</label>
                            </div>
                            {scheduleItems.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <AnimatePresence>
                                        {scheduleItems.map((item, idx) => (
                                            <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex justify-between items-center shadow-inner group">
                                                <div>
                                                    <h4 className="text-white text-sm font-bold truncate">{item.title}</h4>
                                                    <p className="text-[10px] text-cyan-400 font-mono mt-1">
                                                        {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {(item.speaker_name || item.location) && (
                                                        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{item.speaker_name} {item.speaker_name && item.location && ' | '} {item.location}</p>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => handleRemoveScheduleNode(idx)} className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                            <div className="p-5 rounded-[24px] border border-cyan-500/20 bg-cyan-500/5 space-y-4">
                                <h4 className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-3">Deploy Schedule Node</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" name="title" value={newScheduleNode.title} onChange={handleNewScheduleChange} placeholder="Panel Title (Required)" className="w-full bg-black/40 border border-white/[0.05] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50" />
                                    <input type="text" name="speaker_name" value={newScheduleNode.speaker_name} onChange={handleNewScheduleChange} placeholder="Speaker Name (Optional)" className="w-full bg-black/40 border border-white/[0.05] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50" />
                                    <input type="datetime-local" name="start_time" value={newScheduleNode.start_time} onChange={handleNewScheduleChange} min={formData.startDate} max={formData.endDate} className="w-full bg-black/40 border border-white/[0.05] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]" />
                                    <input type="datetime-local" name="end_time" value={newScheduleNode.end_time} onChange={handleNewScheduleChange} min={formData.startDate} max={formData.endDate} className="w-full bg-black/40 border border-white/[0.05] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50 [color-scheme:dark]" />
                                    <input type="text" name="location" value={newScheduleNode.location} onChange={handleNewScheduleChange} placeholder="Location / Room (Optional)" className="w-full bg-black/40 border border-white/[0.05] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50" />
                                    <button type="button" onClick={handleAddScheduleNode} className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">
                                        + Append to Timeline
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-6 border-t border-white/[0.03]">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Custom Domain Routing</label>
                                    <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-full overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/30 transition-all shadow-inner">
                                        <span className="flex items-center pl-6 pr-2 text-zinc-600 text-[10px] font-mono">https://</span>
                                        <input type="text" name="customDomain" value={formData.customDomain} onChange={handleChange} placeholder="events.brand.com" className="w-full bg-transparent text-white px-0 py-4 focus:outline-none text-sm placeholder-zinc-700" />
                                    </div>
                                    <p className="text-[10px] text-zinc-600 ml-4">DNS CNAME must be routed to Vercel/Render Edge proxy.</p>
                                </div>
                                <label className="flex items-center cursor-pointer group mt-4">
                                    <div className="relative">
                                        <input type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleChange} className="sr-only" />
                                        <div className={`w-11 h-6 rounded-full transition-all duration-300 ${formData.isPublic ? 'bg-cyan-500/40' : 'bg-white/[0.05]'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${formData.isPublic ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                    <div className="ml-4">
                                        <span className="block text-xs font-semibold text-zinc-200 uppercase tracking-wider">Public Visibility</span>
                                        <span className="block text-[10px] text-zinc-500 tracking-wide">{formData.isPublic ? 'Broadcasting on Global Hub' : 'Restricted to link access'}</span>
                                    </div>
                                </label>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.02)]">
                                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <div>
                                        <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Orientation Protocol</h4>
                                        <p className="text-[10px] text-amber-500/80 leading-relaxed font-mono">The Hero Engine requires <span className="text-amber-400 font-bold">Landscape (16:9)</span> images.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <input type="url" value={currentImageUrl} onChange={(e) => setCurrentImageUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddImage(e)} placeholder="https://hosted-image-url.com/node.jpg" className="flex-1 bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm placeholder-zinc-700 shadow-inner" />
                                    <button type="button" onClick={handleAddImage} disabled={!currentImageUrl.trim()} className="px-5 rounded-full bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.05] hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-400 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-30">Attach</button>
                                </div>
                                {formData.images.length > 0 && (
                                    <div className="flex gap-4 overflow-x-auto pb-2 pt-1 custom-scrollbar">
                                        <AnimatePresence>
                                            {formData.images.map((url, index) => (
                                                <motion.div key={`${url}-${index}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.1] group/img">
                                                    <img src={url} alt="Attached Node" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                        <button type="button" onClick={() => handleRemoveImage(index)} className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Theme Configurations: Dimensional Customization Engine */}
                        <div className="space-y-6 pt-6 border-t border-white/[0.03]">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2 mb-3">Tenant Brand Aesthetics</label>
                                
                                <div className="mb-6 flex flex-wrap gap-3 ml-2">
                                    {THEME_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => applyThemePreset(preset.config)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition-all group"
                                        >
                                            <div className="w-3.5 h-3.5 rounded-full border border-white/[0.1]" style={{ background: `linear-gradient(135deg, ${preset.config.primary}, ${preset.config.accent})` }} />
                                            <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 tracking-wide">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between shadow-inner transition-colors">
                                    <div className="flex flex-col"><span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Background</span><span className="text-xs text-zinc-400 font-mono uppercase">{formData.themeConfig.background}</span></div>
                                    <input type="color" name="background" value={formData.themeConfig.background} onChange={handleThemeChange} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-inner transition-colors" />
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between shadow-inner transition-colors">
                                    <div className="flex flex-col"><span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Text / Type</span><span className="text-xs text-zinc-400 font-mono uppercase">{formData.themeConfig.text}</span></div>
                                    <input type="color" name="text" value={formData.themeConfig.text} onChange={handleThemeChange} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-inner transition-colors" />
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between shadow-inner transition-colors">
                                    <div className="flex flex-col"><span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Core (Pri)</span><span className="text-xs text-zinc-400 font-mono uppercase">{formData.themeConfig.primary}</span></div>
                                    <input type="color" name="primary" value={formData.themeConfig.primary} onChange={handleThemeChange} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-inner transition-colors" />
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between shadow-inner transition-colors">
                                    <div className="flex flex-col"><span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Portal (Acc)</span><span className="text-xs text-zinc-400 font-mono uppercase">{formData.themeConfig.accent}</span></div>
                                    <input type="color" name="accent" value={formData.themeConfig.accent} onChange={handleThemeChange} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-inner transition-colors" />
                                </div>
                            </div>

                            {/* Architectural & Structural Properties */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div className="space-y-3">
                                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Typography Engine</label>
                                    <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl p-1 shadow-inner">
                                        {['sans', 'serif', 'mono'].map(font => (
                                            <button
                                                key={font} type="button" onClick={() => handleDimensionalChange('fontFamily', font)}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${formData.themeConfig.fontFamily === font ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">UI Geometry (Radius)</label>
                                    <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl p-1 shadow-inner">
                                        {[{val: 'none', label: 'Sharp'}, {val: 'sm', label: 'Structured'}, {val: 'full', label: 'Fluid'}].map(rad => (
                                            <button
                                                key={rad.val} type="button" onClick={() => handleDimensionalChange('radius', rad.val)}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${formData.themeConfig.radius === rad.val ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {rad.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Surface Texture</label>
                                    <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl p-1 shadow-inner">
                                        {['none', 'grid', 'dots', 'grain'].map(tex => (
                                            <button
                                                key={tex} type="button" onClick={() => handleDimensionalChange('texture', tex)}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${formData.themeConfig.texture === tex ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {tex}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/[0.03] flex flex-col sm:flex-row justify-between items-center gap-4">
                            <button type="button" onClick={handlePurge} className={`px-6 py-4 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isConfirmingDelete ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse' : 'bg-rose-500/5 border border-rose-500/20 text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-400'}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {isConfirmingDelete ? 'Confirm Purge' : 'Delete Node'}
                            </button>
                            <div className="flex items-center gap-6">
                                <Link href="/admin" className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors">Discard Changes</Link>
                                <button type="submit" disabled={status === 'submitting'} className="px-8 py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50">
                                    {status === 'submitting' ? 'Updating Node...' : 'Commit Updates'}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </main>
    );
}
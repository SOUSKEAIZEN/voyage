"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    fetchAllAdminEvents, fetchGlobalGuests, fetchNetworkUsers, logoutAdmin, 
    fetchOrganizations, provisionNetworkUser, assignStaffToEvent, createOrganization,
    deleteNetworkUser, removeStaffFromEvent, deleteOrganization 
} from '../../services/api';
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';
import { LumaDropdown } from '@/components/ui/luma-dropdown';

export default function MasterDashboard() {
    const context = '[Master Control Plane]';
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('active_events'); 
    const [events, setEvents] = useState([]);
    const [globalGuests, setGlobalGuests] = useState([]);
    const [networkUsers, setNetworkUsers] = useState([]); 
    const [status, setStatus] = useState('loading'); 
    const [selectedGlobalGuest, setSelectedGlobalGuest] = useState(null);
    const [adminRole, setAdminRole] = useState(null); 

    // --- PROVISIONING STATE ---
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [provisionForm, setProvisionForm] = useState({ email: '', password: '', role: 'staff', organization_id: '' });
    const [provisionStatus, setProvisionStatus] = useState('idle');
    const [provisionMessage, setProvisionMessage] = useState('');

    // --- ASSIGNMENT STATE ---
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [assignmentEventId, setAssignmentEventId] = useState('');
    const [assignStatus, setAssignStatus] = useState('idle');
    const [assignMessage, setAssignMessage] = useState('');

    // --- ORGANIZATION STATE ---
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
    const [orgForm, setOrgForm] = useState({ name: '' });
    const [orgStatus, setOrgStatus] = useState('idle');
    const [orgMessage, setOrgMessage] = useState('');

    // --- DESTRUCTIVE ACTION STATE ---
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', action: null, isLoading: false });
    
    // --- UI EXPANSION STATE ---
    // [Architecture] Track which organization groups are expanded in the UI
    const [expandedOrgs, setExpandedOrgs] = useState({});

    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

    useEffect(() => {
        let inactivityTimer;

        const validateGatekeeper = () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.warn(`${context} Access Denied: Cryptographic token missing. Redirecting to vault.`);
                router.push('/admin/login');
                return false;
            }
            
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                setAdminRole(decoded.role);
            } catch (e) {
                console.warn(`${context} Malformed token detected.`);
            }

            return true;
        };

        const handleLogout = async () => {
            try {
                await logoutAdmin();
            } catch (err) {
                console.warn(`${context} Network fail during inactivity logout.`);
            } finally {
                localStorage.removeItem('adminToken'); 
                router.push('/admin/login');
            }
        };

        const resetInactivityTimer = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                handleLogout();
            }, INACTIVITY_LIMIT_MS);
        };

        if (validateGatekeeper()) {
            if (activeTab === 'active_events' || activeTab === 'previous_events') {
                loadTenants();
            } else if (activeTab === 'guests') {
                loadGlobalGuests();
            } else if (activeTab === 'network_security') {
                loadNetworkUsers();
            } else if (activeTab === 'agencies') {
                loadOrgsDashboard();
            }

            resetInactivityTimer();
            const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
            activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer, { passive: true }));

            return () => {
                if (inactivityTimer) clearTimeout(inactivityTimer);
                activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
            };
        }
    }, [router, activeTab]);

    const loadOrgs = async () => {
        if (adminRole !== 'superadmin') return;
        try {
            const res = await fetchOrganizations();
            setOrganizations(res.data);
        } catch (error) {
            console.error("Failed to load organizations");
        }
    };

    const loadOrgsDashboard = async () => {
        if (adminRole !== 'superadmin') return;
        setStatus('loading');
        try {
            const res = await fetchOrganizations();
            setOrganizations(res.data);
            setStatus('success');
        } catch (error) {
            setStatus('error');
        }
    };

    useEffect(() => {
        if (isProvisionModalOpen && adminRole === 'superadmin') {
            loadOrgs();
        }
    }, [isProvisionModalOpen, adminRole]);

    useEffect(() => {
        if (isAssignModalOpen && events.length === 0) {
            loadTenants();
        }
    }, [isAssignModalOpen, events.length]);

    const loadTenants = async () => {
        setStatus('loading');
        try {
            const data = await fetchAllAdminEvents();
            setEvents(data);
            
            // Auto-expand the Unassigned group by default
            setExpandedOrgs(prev => ({...prev, 'unassigned': true}));
            
            setStatus('success');
        } catch (error) {
            if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('session')) {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
            } else {
                setStatus('error');
            }
        }
    };

    const loadGlobalGuests = async () => {
        setStatus('loading');
        try {
            const result = await fetchGlobalGuests(1, 50); 
            setGlobalGuests(result.data);
            setStatus('success');
        } catch (error) {
            setStatus('error');
        }
    };

    const loadNetworkUsers = async () => {
        setStatus('loading');
        try {
            const result = await fetchNetworkUsers(); 
            setNetworkUsers(result.data);
            setStatus('success');
        } catch (error) {
            setStatus('error');
        }
    };

    const handleLockVault = async () => {
        try {
            await logoutAdmin();
        } catch (err) {} finally {
            localStorage.removeItem('adminToken'); 
            router.push('/admin/login');
        }
    };

    const handleOrgSubmit = async (e) => {
        e.preventDefault();
        setOrgStatus('loading');
        setOrgMessage('');
        try {
            await createOrganization({ name: orgForm.name });
            setOrgStatus('idle');
            setOrgForm({ name: '' });
            setIsOrgModalOpen(false);
            if (activeTab === 'agencies') {
                loadOrgsDashboard();
            } else {
                loadOrgs(); 
            }
        } catch (error) {
            setOrgStatus('error');
            setOrgMessage(error.message);
        }
    };

    const handleProvisionSubmit = async (e) => {
        e.preventDefault();
        setProvisionStatus('loading');
        setProvisionMessage('');
        try {
            const payload = {
                email: provisionForm.email,
                password: provisionForm.password,
                role: provisionForm.role,
                organization_id: provisionForm.organization_id ? parseInt(provisionForm.organization_id) : null
            };
            await provisionNetworkUser(payload);
            setProvisionStatus('idle');
            setProvisionForm({ email: '', password: '', role: 'staff', organization_id: '' });
            setIsProvisionModalOpen(false);
            if (activeTab === 'network_security') loadNetworkUsers(); 
        } catch (error) {
            setProvisionStatus('error');
            setProvisionMessage(error.message);
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!assignmentEventId) return;
        setAssignStatus('loading');
        setAssignMessage('');
        try {
            await assignStaffToEvent({ 
                admin_id: selectedStaff.id, 
                event_id: parseInt(assignmentEventId) 
            });
            setAssignStatus('idle');
            setAssignmentEventId('');
            setIsAssignModalOpen(false);
            loadNetworkUsers(); 
        } catch (error) {
            setAssignStatus('error');
            setAssignMessage(error.message);
        }
    };

    // --- DESTRUCTIVE ACTION PIPELINES ---
    const triggerDeleteUser = (userId, userEmail) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Purge Identity',
            message: `You are about to permanently purge the identity [${userEmail}]. This action cannot be reversed.`,
            action: async () => {
                await deleteNetworkUser(userId);
                loadNetworkUsers();
            }
        });
    };

    const triggerSeverAssignment = (adminId, eventId, eventTitle) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Sever Node Binding',
            message: `Are you sure you want to sever the connection to Event Sandbox [${eventTitle}]?`,
            action: async () => {
                await removeStaffFromEvent({ admin_id: adminId, event_id: eventId });
                loadNetworkUsers(); 
            }
        });
    };

    const triggerDeleteOrg = (orgId, orgName) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Purge Agency',
            message: `You are about to purge the agency [${orgName}]. CRITICAL: The database will violently reject this if there are still active organizers, staff, or events tied to this sandbox. Proceed?`,
            action: async () => {
                await deleteOrganization(orgId);
                loadOrgsDashboard();
            }
        });
    };

    const executeConfirmAction = async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
            if (confirmDialog.action) {
                await confirmDialog.action();
            }
            setConfirmDialog({ isOpen: false, title: '', message: '', action: null, isLoading: false });
        } catch (error) {
            alert(`Execution Failed: ${error.message}`);
            setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
    };

    const closeConfirmDialog = () => {
        if (!confirmDialog.isLoading) {
            setConfirmDialog({ isOpen: false, title: '', message: '', action: null, isLoading: false });
        }
    };

    const openAssignModal = (user) => {
        setSelectedStaff(user);
        setAssignmentEventId('');
        setAssignMessage('');
        setIsAssignModalOpen(true);
    };

    const toggleOrgExpansion = (orgId) => {
        setExpandedOrgs(prev => ({
            ...prev,
            [orgId]: !prev[orgId]
        }));
    };

    const renderStateBadge = (state) => {
        switch(state) {
            case 0: return <span className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-zinc-600"></span> Invited</span>;
            case 1: return <span className="flex items-center gap-1.5 text-indigo-400/80 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></span> Review</span>;
            case 2: return <span className="flex items-center gap-1.5 text-zinc-300 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"></span> Verified</span>;
            case -1: return <span className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-rose-500"></span> Action</span>;
            default: return <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">N/A</span>;
        }
    };

    const renderRoleBadge = (role) => {
        switch(role) {
            case 'superadmin': return <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20 w-fit">Master Tier</span>;
            case 'tenant_admin': return <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 w-fit">Organizer</span>;
            case 'staff': return <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 w-fit">Ground Node</span>;
            default: return <span className="text-[9px] uppercase font-bold text-zinc-500 w-fit">Unknown</span>;
        }
    };

    const activeEvents = events.filter(e => !e.is_expired);
    const previousEvents = events.filter(e => e.is_expired);

    // [Architecture] Grouping Engine for Superadmin View
    const getGroupedEvents = (eventList) => {
        if (adminRole !== 'superadmin') return { unassigned: eventList }; // Tenant admins/staff just get a flat list

        const groups = { unassigned: [] };
        eventList.forEach(event => {
            if (event.organization_id) {
                if (!groups[event.organization_id]) {
                    groups[event.organization_id] = {
                        name: event.organization_name || 'Unknown Agency',
                        events: []
                    };
                }
                groups[event.organization_id].events.push(event);
            } else {
                groups.unassigned.push(event);
            }
        });
        return groups;
    };

    const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    const renderEventCards = (eventList) => {
        if (eventList.length === 0) {
            return (
                <motion.div variants={itemVariant} className="col-span-full py-12 md:py-16 flex flex-col items-center justify-center border border-dashed border-white/[0.05] rounded-3xl md:rounded-[32px] bg-white/[0.01]">
                    <span className="text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">No Nodes Found In Sector</span>
                </motion.div>
            );
        }
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
                {eventList.map((event) => (
                    <motion.div key={event.slug} variants={itemVariant}>
                        <div className={`relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-xl border border-white/[0.05] rounded-3xl md:rounded-[32px] p-6 md:p-8 flex flex-col transition-all duration-500 ease-out md:hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] group h-full ${event.is_expired ? 'opacity-60 grayscale-[80%]' : ''}`}>
                            <div className="hidden md:block absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -skew-x-[30deg] opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-500 ease-out z-0 pointer-events-none" />
                            <div className="relative z-10 flex justify-between items-start mb-6 md:mb-8">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/[0.08] text-xs md:text-sm font-light text-zinc-300 shadow-inner">
                                    {event.slug.charAt(0).toUpperCase()}
                                </div>
                                <span className={`flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] ${event.is_expired ? 'text-rose-500/80' : event.is_public ? 'text-zinc-400' : 'text-indigo-400/80'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${event.is_expired ? 'bg-rose-500/80' : event.is_public ? 'bg-zinc-500' : 'bg-indigo-500'}`}></span>
                                    {event.is_expired ? 'Archived' : event.is_public ? 'Public' : 'Private'}
                                </span>
                            </div>
                            
                            <div className="relative z-10 flex-grow">
                                <h3 className="text-lg md:text-xl font-medium text-white mb-1 md:mb-2 tracking-tight truncate">{event.title}</h3>
                                <a href={`/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 text-[10px] md:text-[11px] font-mono mb-8 md:mb-10 hover:text-cyan-400 transition-colors flex items-center gap-2 w-fit group/link">
                                    /{event.slug}
                                    <svg className="w-3 h-3 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            </div>
                            
                            <div className="relative z-10 mt-4 md:mt-6 flex gap-2 md:gap-3">
                                <Link href={`/admin/${event.slug}`} className="flex-1 bg-white/[0.03] hover:bg-white text-zinc-300 hover:text-black py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-center transition-all shadow-inner hover:shadow-none">
                                    {event.is_expired ? 'View Ledger' : 'Manage Node'}
                                </Link>
                                {!event.is_expired && adminRole !== 'staff' && (
                                    <Link href={`/admin/events/${event.slug}/edit`} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/[0.03] hover:bg-white border border-transparent hover:border-white text-zinc-400 hover:text-black rounded-full transition-all shrink-0">
                                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    };

    // [Architecture] Render Grouped Engine UI
    const renderGroupedViews = (eventList) => {
        if (adminRole !== 'superadmin') {
            return (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full">
                    {renderEventCards(eventList)}
                </motion.div>
            );
        }

        const grouped = getGroupedEvents(eventList);
        const orgIds = Object.keys(grouped).filter(key => key !== 'unassigned');

        return (
            <div className="space-y-6 md:space-y-8 w-full">
                {/* Render Defined Organizations */}
                {orgIds.map(orgId => {
                    const group = grouped[orgId];
                    const isExpanded = expandedOrgs[orgId];
                    return (
                        <div key={orgId} className="bg-white/[0.01] border border-white/[0.05] rounded-3xl md:rounded-[32px] overflow-hidden transition-all duration-300">
                            <button 
                                onClick={() => toggleOrgExpansion(orgId)}
                                className="w-full px-6 md:px-8 py-5 md:py-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-[10px] md:text-xs shrink-0">
                                        {group.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-base md:text-lg font-medium text-white tracking-tight line-clamp-1">{group.name}</h3>
                                        <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 md:mt-1">{group.events.length} Nodes Allocated</p>
                                    </div>
                                </div>
                                <div className={`text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </button>
                            
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }} 
                                        animate={{ height: 'auto', opacity: 1 }} 
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/[0.02]"
                                    >
                                        <div className="p-4 md:p-8">
                                            {renderEventCards(group.events)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {/* Render Unassigned / Global Sandbox */}
                {grouped.unassigned.length > 0 && (
                    <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl md:rounded-[32px] overflow-hidden transition-all duration-300">
                        <button 
                            onClick={() => toggleOrgExpansion('unassigned')}
                            className="w-full px-6 md:px-8 py-5 md:py-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-[10px] md:text-xs shrink-0">
                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base md:text-lg font-medium text-white tracking-tight line-clamp-1">Global / Unassigned Nodes</h3>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 md:mt-1">{grouped.unassigned.length} Sandbox(es) Detached</p>
                                </div>
                            </div>
                            <div className={`text-zinc-500 transition-transform duration-300 ${expandedOrgs['unassigned'] ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </button>
                        
                        <AnimatePresence>
                            {expandedOrgs['unassigned'] && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/[0.02]"
                                >
                                    <div className="p-4 md:p-8">
                                        {renderEventCards(grouped.unassigned)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        );
    };

    const roleOptions = [
        { label: 'Level 2: Event Staff (Ground Node)', value: 'staff' },
        ...(adminRole === 'superadmin' ? [{ label: 'Level 1: Tenant Admin (Organizer)', value: 'tenant_admin' }] : [])
    ];

    const orgOptions = [
        { label: 'Global / Unassigned', value: '' },
        ...organizations.map(org => ({ label: org.name, value: String(org.id) }))
    ];

    const activeEventOptions = [
        { label: '-- Select Event Sandbox --', value: '' },
        ...activeEvents.map(ev => ({ label: ev.title, value: String(ev.id) }))
    ];

    return (
        <main className="min-h-screen bg-[#09090b] flex flex-col items-center text-zinc-200 relative selection:bg-cyan-500/30 overflow-hidden">
            <AmbientAurora />
            <InteractiveAura />

            {/* [Architecture] Mobile UI: Stacked header on mobile to accommodate buttons without breaking */}
            <header className="w-full max-w-7xl flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-6 sm:py-8 z-20 border-b border-white/[0.02] gap-4 sm:gap-0">
                <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center font-bold text-[10px] sm:text-xs tracking-tighter shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0">NX</div>
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-3xl font-light text-white tracking-tight mb-0.5 sm:mb-1">Control Plane</h1>
                        <p className="text-[8px] sm:text-[9px] text-zinc-500 font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase truncate">Master Ledger Management</p>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                    {adminRole !== 'staff' && (
                        <Link href="/admin/events/new" className="flex items-center justify-center flex-1 sm:flex-none gap-2 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-black bg-white hover:bg-zinc-200 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95">
                            Deploy Tenant
                        </Link>
                    )}
                    <button onClick={handleLockVault} className="flex items-center justify-center flex-1 sm:flex-none gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] px-4 sm:px-6 py-2.5 sm:py-3 rounded-full backdrop-blur-md active:scale-95">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                        Lock Vault
                    </button>
                </div>
            </header>

            <div className="max-w-7xl w-full z-10 flex flex-col px-4 sm:px-6 pb-16 pt-6 sm:pt-8">
                <div className="flex space-x-6 sm:space-x-10 mb-8 sm:mb-12 border-b border-white/[0.05] overflow-x-auto custom-scrollbar whitespace-nowrap pb-1">
                    <button onClick={() => setActiveTab('active_events')} className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'active_events' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                        Active Tenants
                        {activeTab === 'active_events' && <motion.span layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></motion.span>}
                    </button>
                    <button onClick={() => setActiveTab('previous_events')} className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'previous_events' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                        Historical Nodes
                        {activeTab === 'previous_events' && <motion.span layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></motion.span>}
                    </button>
                    {adminRole === 'superadmin' && (
                        <button onClick={() => setActiveTab('agencies')} className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'agencies' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                            Agencies
                            {activeTab === 'agencies' && <motion.span layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></motion.span>}
                        </button>
                    )}
                    {(adminRole === 'superadmin' || adminRole === 'tenant_admin') && (
                        <button onClick={() => setActiveTab('guests')} className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'guests' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                            {adminRole === 'superadmin' ? 'Global Directory' : 'Guest Directory'}
                            {activeTab === 'guests' && <motion.span layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></motion.span>}
                        </button>
                    )}
                    {(adminRole === 'superadmin' || adminRole === 'tenant_admin') && (
                        <button onClick={() => setActiveTab('network_security')} className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'network_security' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
                            Security
                            {activeTab === 'network_security' && <motion.span layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></motion.span>}
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {status === 'loading' ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 sm:py-32">
                            <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </motion.div>
                    ) : activeTab === 'active_events' ? (
                        <motion.div key="active_events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                            {renderGroupedViews(activeEvents)}
                        </motion.div>
                    ) : activeTab === 'previous_events' ? (
                        <motion.div key="previous_events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                            {renderGroupedViews(previousEvents)}
                        </motion.div>
                    ) : activeTab === 'agencies' && adminRole === 'superadmin' ? (
                        <motion.div key="agencies" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="bg-white/[0.01] backdrop-blur-xl rounded-3xl md:rounded-[32px] border border-white/[0.05] overflow-hidden shadow-2xl">
                            <div className="p-5 md:p-8 border-b border-white/[0.03] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                                <div>
                                    <h2 className="text-base md:text-lg font-medium text-white tracking-tight">Agency Ledger</h2>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Manage Tenant Sandboxes</p>
                                </div>
                                <button onClick={() => setIsOrgModalOpen(true)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all">
                                    + Mint Agency
                                </button>
                            </div>
                            
                            {/* [Architecture] Mobile UI: Convert HTML Table to flex cards on small screens */}
                            <div className="block md:hidden divide-y divide-white/[0.02]">
                                {organizations.length === 0 ? (
                                    <div className="py-12 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">No Agencies Deployed.</div>
                                ) : organizations.map((org) => (
                                    <div key={org.id} className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="text-[10px] text-zinc-400 font-mono">ID: {org.id}</div>
                                            <div className="text-[9px] font-mono text-zinc-500">{new Date(org.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-sm font-medium text-zinc-200 tracking-tight">{org.name}</div>
                                        <div className="pt-2">
                                            <button onClick={() => triggerDeleteOrg(org.id, org.name)} className="w-full py-2.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-widest active:scale-95">Purge Agency</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Standard Table for Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.02] bg-white/[0.01]">
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agency ID</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agency Name</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Deployment Date</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {organizations.length === 0 ? (
                                            <tr><td colSpan="4" className="py-20 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase border-dashed border-t border-white/[0.05]">No Agencies Deployed.</td></tr>
                                        ) : organizations.map((org) => (
                                            <tr key={org.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-6"><div className="text-[10px] text-zinc-400 font-mono">{org.id}</div></td>
                                                <td className="px-8 py-6"><div className="text-sm font-medium text-zinc-200 tracking-tight">{org.name}</div></td>
                                                <td className="px-8 py-6 text-[10px] font-mono text-zinc-500">{new Date(org.created_at).toLocaleDateString()}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => triggerDeleteOrg(org.id, org.name)} className="px-4 py-2 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 text-[9px] font-bold uppercase tracking-widest transition-all">Purge Agency</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : activeTab === 'network_security' ? (
                        <motion.div key="network_security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="bg-white/[0.01] backdrop-blur-xl rounded-3xl md:rounded-[32px] border border-white/[0.05] overflow-hidden shadow-2xl">
                            <div className="p-5 md:p-8 border-b border-white/[0.03] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                                <div>
                                    <h2 className="text-base md:text-lg font-medium text-white tracking-tight">Access Control & Identities</h2>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Manage Tiered Authorization Nodes</p>
                                </div>
                                <div className="w-full sm:w-auto">
                                    <button onClick={() => setIsProvisionModalOpen(true)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-300 hover:text-white hover:bg-white/[0.08] text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all">
                                        + Provision Account
                                    </button>
                                </div>
                            </div>
                            
                            {/* [Architecture] Mobile UI: Convert HTML Table to flex cards on small screens */}
                            <div className="block md:hidden divide-y divide-white/[0.02]">
                                {networkUsers.length === 0 ? (
                                    <div className="py-12 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">No Active Identities Found.</div>
                                ) : networkUsers.map((user) => (
                                    <div key={user.id} className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="text-[10px] text-zinc-400 font-mono truncate mr-2">ID: {user.id}</div>
                                            {renderRoleBadge(user.role)}
                                        </div>
                                        <div className="text-sm font-medium text-zinc-200 tracking-tight truncate">{user.email}</div>
                                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pt-1">
                                            {user.organization_name || 'Global Sandbox'}
                                        </div>
                                        {user.role === 'staff' && user.assignments && user.assignments.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {user.assignments.map(assign => (
                                                    <button key={assign.id} onClick={() => triggerSeverAssignment(user.id, assign.id, assign.title)} className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 active:scale-95 transition-transform max-w-full">
                                                        <span className="truncate">{assign.title}</span>
                                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="pt-3 flex gap-2">
                                            {user.role === 'staff' && (
                                                <button onClick={() => openAssignModal(user)} className="flex-1 py-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform">Link Node</button>
                                            )}
                                            {user.role !== 'superadmin' && (
                                                <button onClick={() => triggerDeleteUser(user.id, user.email)} className="flex-1 py-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform">Purge</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Standard Table for Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.02] bg-white/[0.01]">
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Identity UUID</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Network Email</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Security Tier</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Organization / Assignments</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {networkUsers.length === 0 ? (
                                            <tr><td colSpan="5" className="py-20 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase border-dashed border-t border-white/[0.05]">No Active Identities Found.</td></tr>
                                        ) : networkUsers.map((user) => (
                                            <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-6"><div className="text-[10px] text-zinc-400 font-mono">{user.id}</div></td>
                                                <td className="px-8 py-6"><div className="text-sm font-medium text-zinc-200 tracking-tight">{user.email}</div></td>
                                                <td className="px-8 py-6">{renderRoleBadge(user.role)}</td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                                        {user.organization_name || 'Global Sandbox'}
                                                    </div>
                                                    {user.role === 'staff' && user.assignments && user.assignments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {user.assignments.map(assign => (
                                                                <button key={assign.id} onClick={() => triggerSeverAssignment(user.id, assign.id, assign.title)} className="group/badge flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-all" title="Click to Sever Binding">
                                                                    {assign.title}
                                                                    <svg className="w-3 h-3 opacity-0 group-hover/badge:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right flex justify-end gap-3">
                                                    {user.role === 'staff' && (
                                                        <button onClick={() => openAssignModal(user)} className="px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-300 text-[9px] font-bold uppercase tracking-widest transition-all">Link Node</button>
                                                    )}
                                                    {user.role !== 'superadmin' && (
                                                        <button onClick={() => triggerDeleteUser(user.id, user.email)} className="px-4 py-2 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 text-[9px] font-bold uppercase tracking-widest transition-all">Purge</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="guests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="bg-white/[0.01] backdrop-blur-xl rounded-3xl md:rounded-[32px] border border-white/[0.05] overflow-hidden shadow-2xl">
                            {/* [Architecture] Mobile UI: Convert HTML Table to flex cards on small screens */}
                            <div className="block md:hidden divide-y divide-white/[0.02]">
                                {globalGuests.length === 0 ? (
                                    <div className="py-12 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">No guests located in ledger.</div>
                                ) : globalGuests.map((guest) => (
                                    <div key={guest.id} className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm font-medium text-zinc-200 tracking-tight">{guest.full_name}</div>
                                            <div className="text-[9px] font-mono text-zinc-500">{new Date(guest.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-[9px] text-zinc-600 font-mono truncate">ID: {guest.id}</div>
                                        <div className="text-xs text-zinc-400 truncate">{guest.email}</div>
                                        {guest.phone && <div className="text-[10px] text-zinc-600">{guest.phone}</div>}
                                        <div className="pt-2">
                                            <button onClick={() => setSelectedGlobalGuest(guest)} className="w-full py-2.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 active:scale-95 transition-transform">View Vault</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Standard Table for Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.02] bg-white/[0.01]">
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{adminRole === 'superadmin' ? 'Global Identity' : 'Guest Identity'}</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Communication</th>
                                            <th className="px-8 py-6 text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Entry Date</th>
                                            <th className="px-8 py-6 text-right text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {globalGuests.length === 0 ? (
                                            <tr><td colSpan="4" className="py-20 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase border-dashed border-t border-white/[0.05]">No guests located in ledger.</td></tr>
                                        ) : globalGuests.map((guest) => (
                                            <tr key={guest.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="text-sm font-medium text-zinc-200 tracking-tight">{guest.full_name}</div>
                                                    <div className="text-[10px] text-zinc-600 font-mono mt-1.5">{guest.id}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs text-zinc-400">{guest.email}</div>
                                                    <div className="text-[10px] text-zinc-600 mt-1.5">{guest.phone || 'No phone'}</div>
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-mono text-zinc-500">{new Date(guest.created_at).toLocaleDateString()}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => setSelectedGlobalGuest(guest)} className="text-[9px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white hover:bg-white hover:text-black transition-all">View Vault</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- CREATE ORGANIZATION MODAL --- */}
            <AnimatePresence>
                {isOrgModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#09090b]/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#09090b] border border-white/[0.08] rounded-3xl sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden relative p-6 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            
                            <div className="flex justify-between items-center mb-6 sm:mb-8 relative z-[60]">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">Mint Agency</h2>
                                    <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Deploy New Tenant Sandbox</p>
                                </div>
                                <button onClick={() => setIsOrgModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {orgStatus === 'error' && (
                                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl relative z-[60]">
                                    {orgMessage}
                                </div>
                            )}

                            <form onSubmit={handleOrgSubmit} className="space-y-5 sm:space-y-6">
                                <div className="space-y-2 relative z-30">
                                    <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Agency Name</label>
                                    <input 
                                        type="text" required
                                        value={orgForm.name} onChange={(e) => setOrgForm({ name: e.target.value })}
                                        className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 sm:px-6 py-3.5 sm:py-4 focus:outline-none focus:border-cyan-500/50 text-[16px] sm:text-sm shadow-inner placeholder:text-zinc-600"
                                        placeholder="e.g., Horizon Events"
                                    />
                                </div>

                                <div className="pt-2 sm:pt-4 relative z-10">
                                    <button 
                                        type="submit" disabled={orgStatus === 'loading'}
                                        className="w-full py-3.5 sm:py-4 bg-white text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        {orgStatus === 'loading' ? 'Deploying Ledger...' : 'Initialize Organization'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- ASSIGNMENT MODAL --- */}
            <AnimatePresence>
                {isAssignModalOpen && selectedStaff && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#09090b]/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#09090b] border border-white/[0.08] rounded-3xl sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md overflow-visible relative p-6 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 sm:mb-8 relative z-[60]">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">Link Ground Node</h2>
                                    <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-1 truncate max-w-[200px] sm:max-w-none">Assign {selectedStaff.email}</p>
                                </div>
                                <button onClick={() => setIsAssignModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {assignStatus === 'error' && (
                                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl relative z-[60]">
                                    {assignMessage}
                                </div>
                            )}

                            <form onSubmit={handleAssignSubmit} className="space-y-5 sm:space-y-6">
                                <div className="space-y-2 relative z-50">
                                    <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Target Event Sandbox</label>
                                    <LumaDropdown 
                                        value={assignmentEventId} 
                                        onChange={(val) => setAssignmentEventId(val)}
                                        options={activeEventOptions}
                                        direction="down"
                                    />
                                </div>

                                <div className="pt-2 sm:pt-4 relative z-10">
                                    <button 
                                        type="submit" disabled={assignStatus === 'loading' || !assignmentEventId}
                                        className="w-full py-3.5 sm:py-4 bg-cyan-500 text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 active:scale-95"
                                    >
                                        {assignStatus === 'loading' ? 'Committing Link...' : 'Execute Binding Protocol'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- PROVISIONING MODAL --- */}
            <AnimatePresence>
                {isProvisionModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#09090b]/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#09090b] border border-white/[0.08] rounded-3xl sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md overflow-visible relative p-6 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6 sm:mb-8 relative z-[60]">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">Provision Identity</h2>
                                    <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Network Access Generation</p>
                                </div>
                                <button onClick={() => setIsProvisionModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {provisionStatus === 'error' && (
                                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl relative z-[60]">
                                    {provisionMessage}
                                </div>
                            )}

                            <form onSubmit={handleProvisionSubmit} className="space-y-4 sm:space-y-6">
                                <div className="space-y-2 relative z-30">
                                    <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Email Address</label>
                                    <input 
                                        type="email" required
                                        value={provisionForm.email} onChange={(e) => setProvisionForm({...provisionForm, email: e.target.value})}
                                        className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 sm:px-6 py-3 sm:py-4 focus:outline-none focus:border-cyan-500/50 text-[16px] sm:text-sm shadow-inner"
                                    />
                                </div>

                                <div className="space-y-2 relative z-20">
                                    <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Temporary Password</label>
                                    <input 
                                        type="password" required minLength={8}
                                        value={provisionForm.password} onChange={(e) => setProvisionForm({...provisionForm, password: e.target.value})}
                                        className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-5 sm:px-6 py-3 sm:py-4 focus:outline-none focus:border-cyan-500/50 text-[16px] sm:text-sm shadow-inner"
                                    />
                                </div>

                                <div className="space-y-2 relative z-50">
                                    <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Clearance Tier</label>
                                    <LumaDropdown 
                                        value={provisionForm.role} 
                                        onChange={(val) => setProvisionForm({...provisionForm, role: val})}
                                        options={roleOptions}
                                        direction="down"
                                    />
                                </div>

                                {adminRole === 'superadmin' && provisionForm.role !== 'superadmin' && (
                                    <div className="space-y-2 relative z-40">
                                        <label className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Organization Binding</label>
                                        <LumaDropdown 
                                            value={provisionForm.organization_id} 
                                            onChange={(val) => setProvisionForm({...provisionForm, organization_id: val})}
                                            options={orgOptions}
                                            direction="up" // Adjusted to 'up' in case the modal gets too tall on mobile
                                        />
                                    </div>
                                )}

                                <div className="pt-2 sm:pt-4 relative z-10">
                                    <button 
                                        type="submit" disabled={provisionStatus === 'loading'}
                                        className="w-full py-3.5 sm:py-4 bg-white text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        {provisionStatus === 'loading' ? 'Minting Identity...' : 'Initialize Record'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- GLOBAL GUEST VAULT MODAL --- */}
            <AnimatePresence>
                {selectedGlobalGuest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#09090b]/40 backdrop-blur-3xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-white/[0.02] border border-white/[0.08] rounded-3xl sm:rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                            <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -skew-x-[30deg] animate-[modalSweep_2s_ease-out_forwards] pointer-events-none z-0" />
                            
                            <div className="p-6 sm:p-10 relative z-10 overflow-y-auto custom-scrollbar flex-1">
                                <div className="flex justify-between items-start mb-8 sm:mb-10">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/[0.05] rounded-full flex items-center justify-center border border-white/[0.1] text-white font-medium text-xl sm:text-2xl shadow-inner shrink-0">{selectedGlobalGuest.full_name.charAt(0)}</div>
                                        <div>
                                            <h2 className="text-lg sm:text-2xl font-medium text-white tracking-tight">{selectedGlobalGuest.full_name}</h2>
                                            <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-0.5 sm:mt-1 truncate max-w-[150px] sm:max-w-none">UUID: <span className="text-zinc-400">{selectedGlobalGuest.id}</span></p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedGlobalGuest(null)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] rounded-full text-zinc-500 hover:text-white transition-colors border border-white/[0.05] hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 shrink-0 p-1"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-10 p-5 sm:p-6 bg-white/[0.02] rounded-2xl sm:rounded-[32px] border border-white/[0.05] shadow-inner">
                                    <div className="space-y-1"><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Network Email</span><p className="text-xs text-zinc-200 truncate">{selectedGlobalGuest.email}</p></div>
                                    <div className="space-y-1"><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Contact Phone</span><p className="text-xs text-zinc-200">{selectedGlobalGuest.phone || 'Not Provided'}</p></div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h3 className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1 sm:ml-2">Active Node Registrations</h3>
                                    <div className="space-y-2 pr-1 sm:pr-2">
                                        {selectedGlobalGuest.registered_events?.length === 0 ? (
                                             <div className="p-4 text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest border border-dashed border-white/[0.05] rounded-xl">No active registrations.</div>
                                        ) : (
                                            selectedGlobalGuest.registered_events?.map((ticket, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-colors group">
                                                    <div>
                                                        <div className="text-xs font-semibold text-zinc-200">{ticket.title}</div>
                                                        <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono mt-0.5">/{ticket.slug}</div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/[0.05] sm:border-none pt-3 sm:pt-0">
                                                        {renderStateBadge(ticket.state)}
                                                        <Link href={`/admin/${ticket.slug}`} className="text-zinc-600 hover:text-cyan-400 transition-colors sm:group-hover:translate-x-1 duration-300 bg-white/[0.03] sm:bg-transparent p-2 sm:p-0 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></Link>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 sm:px-10 py-5 sm:py-6 bg-white/[0.01] border-t border-white/[0.05] flex justify-end relative z-10 shrink-0">
                                <button onClick={() => setSelectedGlobalGuest(null)} className="w-full sm:w-auto text-[9px] sm:text-[10px] font-bold tracking-widest uppercase px-6 py-3.5 sm:py-3 rounded-full bg-white text-black transition-all hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95">Close Vault</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- DESTRUCTIVE ACTION CONFIRMATION MODAL --- */}
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-[#09090b]/80 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#09090b] border border-rose-500/20 rounded-3xl sm:rounded-[40px] shadow-[0_0_50px_rgba(225,29,72,0.15)] w-full max-w-md overflow-hidden relative p-6 sm:p-10">
                            
                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 mb-6 sm:mb-8">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-medium text-rose-500 tracking-tight">{confirmDialog.title}</h2>
                                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 sm:mt-2 leading-relaxed">{confirmDialog.message}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                                <button 
                                    onClick={closeConfirmDialog}
                                    disabled={confirmDialog.isLoading}
                                    className="w-full sm:flex-1 py-3.5 sm:py-4 bg-white/[0.03] border border-white/[0.05] text-zinc-300 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full hover:bg-white/[0.08] transition-all disabled:opacity-50 active:scale-95"
                                >
                                    Cancel Request
                                </button>
                                <button 
                                    onClick={executeConfirmAction}
                                    disabled={confirmDialog.isLoading}
                                    className="w-full sm:flex-1 py-3.5 sm:py-4 bg-rose-500 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest rounded-full hover:bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all disabled:opacity-50 flex justify-center items-center active:scale-95"
                                >
                                    {confirmDialog.isLoading ? (
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        'Execute Action'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </main>
    );
}
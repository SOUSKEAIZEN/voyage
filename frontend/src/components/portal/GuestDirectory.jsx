"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAbyss } from '@/components/AbyssProvider';
import { fetchGuestDirectory, fetchGuestEchoState, fetchDirectMessages } from '@/services/api'; 

export function GuestDirectory({ eventSlug, currentGuestId }) {
    const { socket, isConnected } = useAbyss();
    const [directory, setDirectory] = useState([]);
    const [onlineGuests, setOnlineGuests] = useState(new Set());
    const [inboundEchos, setInboundEchos] = useState([]);
    const [pendingOutbound, setPendingOutbound] = useState(new Set());
    const [connections, setConnections] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Chat State
    const [activeChat, setActiveChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef(null);
    
    // Typing State Engine
    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);

    // Initial Hydration
    useEffect(() => {
        let isMounted = true;
        const hydrateState = async () => {
            try {
                const [dirData, stateData] = await Promise.all([
                    fetchGuestDirectory(eventSlug),
                    fetchGuestEchoState(eventSlug)
                ]);
                
                if (isMounted) {
                    setDirectory(dirData.filter(g => g.id !== currentGuestId));
                    setInboundEchos(stateData.inbound);
                    setPendingOutbound(new Set(stateData.outbound));
                    setConnections(new Set(stateData.connections));
                    setOnlineGuests(new Set(stateData.online));
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to hydrate Direct Mesh state", error);
                if (isMounted) setIsLoading(false);
            }
        };
        hydrateState();
        return () => { isMounted = false; };
    }, [eventSlug, currentGuestId]);

    // Socket Nervous System
    useEffect(() => {
        if (!socket || !isConnected) return;

        // [Architecture Fix] Explicitly join the mesh so the backend broadcasts presence!
        socket.emit('join_abyss');

        const handlePresence = (payload) => {
            setOnlineGuests(prev => {
                const newSet = new Set(prev);
                if (payload.action === 'entered') newSet.add(payload.guest_id);
                if (payload.action === 'departed') newSet.delete(payload.guest_id);
                return newSet;
            });
        };

        const handleInboundEcho = (payload) => {
            setInboundEchos(prev => prev.includes(payload.sender_id) ? prev : [...prev, payload.sender_id]);
        };

        const handleEchoResolved = (payload) => {
            if (payload.status === 'accepted') {
                setConnections(prev => new Set(prev).add(payload.target_id));
                setPendingOutbound(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(payload.target_id);
                    return newSet;
                });
            }
        };

        const handleReceiveDM = (payload) => {
            setChatMessages(prev => {
                if (activeChat && (payload.sender_id === activeChat.id || payload.receiver_id === activeChat.id)) {
                    return [...prev, payload];
                }
                return prev;
            });
            // Stop typing indicator when a message actually arrives
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(payload.sender_id);
                return newSet;
            });
            setTimeout(() => {
                if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }, 50);
        };

        // Catch incoming typing signals
        const handleReceiveTypingPulse = (payload) => {
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                if (payload.is_typing) newSet.add(payload.sender_id);
                else newSet.delete(payload.sender_id);
                return newSet;
            });
            setTimeout(() => {
                if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }, 50);
        };

        socket.on('presence_update', handlePresence);
        socket.on('inbound_echo', handleInboundEcho);
        socket.on('echo_resolved', handleEchoResolved);
        socket.on('receive_direct_message', handleReceiveDM);
        socket.on('receive_typing_pulse', handleReceiveTypingPulse);

        return () => {
            socket.off('presence_update', handlePresence);
            socket.off('inbound_echo', handleInboundEcho);
            socket.off('echo_resolved', handleEchoResolved);
            socket.off('receive_direct_message', handleReceiveDM);
            socket.off('receive_typing_pulse', handleReceiveTypingPulse);
        };
    }, [socket, isConnected, activeChat]);

    const handleSendEcho = (targetId) => {
        if (!socket || !isConnected) return;
        socket.emit('send_echo', { target_guest_id: targetId });
        setPendingOutbound(prev => new Set(prev).add(targetId));
    };

    const handleAcceptEcho = (senderId) => {
        if (!socket || !isConnected) return;
        socket.emit('accept_echo', { sender_guest_id: senderId });
        setInboundEchos(prev => prev.filter(id => id !== senderId));
        setConnections(prev => new Set(prev).add(senderId));
    };

    const openChat = async (guest) => {
        setActiveChat(guest);
        try {
            const msgs = await fetchDirectMessages(eventSlug, guest.id);
            setChatMessages(msgs);
            setTimeout(() => {
                if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }, 100);
        } catch (error) {
            console.error("Failed to load DMs", error);
        }
    };

    // The Typing Engine
    const handleInputChange = (e) => {
        setChatInput(e.target.value);
        if (!socket || !activeChat) return;

        // Emit typing START
        socket.emit('typing_pulse', { target_guest_id: activeChat.id, is_typing: true });

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set a timeout to emit typing STOP if user stops typing for 1.5s
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing_pulse', { target_guest_id: activeChat.id, is_typing: false });
        }, 1500);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChat || !socket) return;

        // Force stop typing on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('typing_pulse', { target_guest_id: activeChat.id, is_typing: false });

        socket.emit('send_direct_message', { target_guest_id: activeChat.id, content: chatInput });
        setChatInput('');
    };

    if (activeChat) {
        return (
            <div 
                // [Architecture] Mobile UI: Fluid height for chat box
                className="w-full h-[70vh] md:h-[500px] flex flex-col bg-black/40 backdrop-blur-2xl border border-white/[0.05] overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]"
                style={{ borderRadius: 'var(--tenant-radius)' }}
            >
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.05] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => setActiveChat(null)} 
                            className="p-1.5 md:p-2 bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                            style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        >
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: 'var(--tenant-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h3 className="text-xs md:text-sm font-bold tracking-wide text-[var(--tenant-text)] truncate max-w-[150px] sm:max-w-[200px]">{activeChat.full_name}</h3>
                            <span className="text-[9px] md:text-[10px] uppercase tracking-widest flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--tenant-text)', opacity: 0.7 }}>
                                <span className={`w-1.5 h-1.5 rounded-full ${onlineGuests.has(activeChat.id) ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></span> 
                                {onlineGuests.has(activeChat.id) ? 'Active Uplink' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-white/10">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-50" style={{ color: 'var(--tenant-text)' }}>
                            <svg className="w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold">End-to-End Ephemeral</p>
                        </div>
                    ) : (
                        chatMessages.map((msg, idx) => {
                            const isMe = msg.sender_id === currentGuestId;
                            return (
                                <div key={msg.id || idx} className={`flex flex-col max-w-[85%] md:max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <div 
                                        className="px-4 py-2.5 md:px-5 md:py-3 text-sm leading-relaxed border shadow-sm backdrop-blur-md" 
                                        style={{
                                            color: 'var(--tenant-text)',
                                            backgroundColor: isMe ? 'color-mix(in srgb, var(--tenant-primary) 15%, transparent)' : 'rgba(255,255,255,0.03)',
                                            borderColor: isMe ? 'color-mix(in srgb, var(--tenant-primary) 30%, transparent)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: '16px',
                                            borderBottomRightRadius: isMe ? '4px' : '16px',
                                            borderBottomLeftRadius: isMe ? '16px' : '4px',
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Animated Typing Indicator UI */}
                    {typingUsers.has(activeChat.id) && (
                        <div className="flex flex-col max-w-[80%] mr-auto items-start animate-fade-in">
                            <div className="px-3 md:px-4 py-2 md:py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-bl-sm flex items-center gap-1.5">
                                <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tenant-primary)', animationDelay: '0ms' }}></span>
                                <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tenant-primary)', animationDelay: '150ms' }}></span>
                                <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tenant-primary)', animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 md:p-4 border-t border-white/[0.05] bg-black/20">
                    <form onSubmit={handleSendMessage} className="relative flex items-center w-full">
                        <input 
                            type="text"
                            value={chatInput}
                            onChange={handleInputChange}
                            placeholder="Transmit securely..."
                            // [Architecture] Mobile UI: text-[16px] prevents iOS Zoom
                            className="w-full bg-black/40 border border-white/[0.1] py-3 md:py-3.5 pl-4 md:pl-6 pr-12 md:pr-14 text-[16px] md:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] transition-all disabled:opacity-50 placeholder-white/30"
                            style={{ color: 'var(--tenant-text)', borderRadius: 'var(--tenant-btn-radius)' }}
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim()} 
                            className="absolute right-1.5 md:right-2 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            style={{ backgroundColor: 'var(--tenant-primary)', color: 'var(--tenant-bg)', borderRadius: 'var(--tenant-btn-radius)' }}
                        >
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4 md:gap-6 relative z-10">
            <div className="flex flex-col gap-1.5 md:gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-[var(--tenant-text)]">Node Directory</h2>
                <p className="text-xs md:text-sm text-[var(--tenant-text)] opacity-60">Discover and connect with verified attendees. Echos dissolve when the node closes.</p>
            </div>

            <AnimatePresence>
                {inboundEchos.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="w-full bg-black/40 border border-white/10 p-4 md:p-6 mb-2"
                        style={{ borderRadius: 'var(--tenant-radius)' }}
                    >
                        <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2" style={{ color: 'var(--tenant-accent)' }}>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--tenant-accent)' }}></span>
                            Incoming Echos ({inboundEchos.length})
                        </h3>
                        <div className="space-y-2.5 md:space-y-3">
                            {inboundEchos.map(senderId => {
                                const sender = directory.find(g => g.id === senderId);
                                return (
                                    <div 
                                        key={senderId} 
                                        // [Architecture] Mobile UI: Flex col on mobile for easier button tapping
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.03] p-3 md:p-4 border border-white/[0.05] shadow-inner"
                                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                                    >
                                        <div>
                                            <p className="text-xs md:text-sm font-bold text-[var(--tenant-text)]">{sender?.full_name || 'Unknown Guest'}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleAcceptEcho(senderId)} 
                                            // [Architecture] Mobile UI: Full width button on mobile
                                            className="w-full sm:w-auto px-4 py-2.5 md:py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest sm:hover:scale-105 transition-all shadow-[0_0_15px_color-mix(in_srgb,var(--tenant-accent)_30%,transparent)]"
                                            style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-bg)', borderRadius: 'var(--tenant-btn-radius)' }}
                                        >
                                            Accept Echo
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* [Architecture] Mobile UI: Changed from sm:grid-cols-2 to md:grid-cols-2 so lists stack on tablets as well */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {isLoading ? (
                    <div className="col-span-full py-8 md:py-12 flex flex-col items-center justify-center">
                        <svg className="animate-spin w-5 h-5 md:w-6 md:h-6 mb-3 opacity-50 text-[var(--tenant-text)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                ) : directory.length === 0 ? (
                    <div className="col-span-full py-8 md:py-12 text-center border border-dashed border-white/[0.1]" style={{ borderRadius: 'var(--tenant-radius)' }}>
                        <p className="text-xs md:text-sm opacity-60 text-[var(--tenant-text)] font-medium">You are the only verified guest currently in this node.</p>
                    </div>
                ) : (
                    directory.map((guest) => {
                        const isOnline = onlineGuests.has(guest.id);
                        const isPending = pendingOutbound.has(guest.id);
                        const hasConnection = connections.has(guest.id);

                        return (
                            <div 
                                key={guest.id} 
                                className="group relative overflow-hidden bg-black/20 backdrop-blur-md border border-white/[0.05] p-4 md:p-5 transition-all hover:bg-black/40"
                                style={{ borderRadius: 'var(--tenant-radius)' }}
                            >
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="flex items-center gap-2.5 md:gap-3">
                                        <div 
                                            className="w-8 h-8 md:w-10 md:h-10 bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] md:text-xs font-bold shadow-inner"
                                            style={{ color: 'var(--tenant-text)', borderRadius: 'var(--tenant-btn-radius)' }}
                                        >
                                            {guest.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xs md:text-sm font-bold text-[var(--tenant-text)]">{guest.full_name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-[var(--tenant-text)] opacity-60">{isOnline ? 'Active' : 'Offline'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 md:mt-4 md:pt-4 border-t border-white/[0.05] flex justify-end">
                                    {hasConnection ? (
                                        <button 
                                            onClick={() => openChat(guest)} 
                                            // [Architecture] Mobile UI: Full width button on mobile for easier tapping
                                            className="w-full sm:w-auto justify-center px-4 py-2 md:py-2 border text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5 shadow-sm"
                                            style={{ 
                                                backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 15%, transparent)', 
                                                color: 'var(--tenant-primary)', 
                                                borderColor: 'color-mix(in srgb, var(--tenant-primary) 30%, transparent)', 
                                                borderRadius: 'var(--tenant-btn-radius)' 
                                            }}
                                        >
                                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                            Secure Channel
                                        </button>
                                    ) : isPending ? (
                                        <span className="w-full sm:w-auto justify-center text-[9px] md:text-[10px] py-1 md:py-0 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80" style={{ color: 'var(--tenant-accent)' }}>
                                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Echo Traveling...
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleSendEcho(guest.id)} 
                                            // [Architecture] Mobile UI: Full width button on mobile
                                            className="w-full sm:w-auto justify-center py-1.5 md:py-0 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/[0.05] sm:bg-transparent rounded-sm sm:rounded-none"
                                            style={{ color: 'var(--tenant-text)' }}
                                        >
                                            Cast Echo
                                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
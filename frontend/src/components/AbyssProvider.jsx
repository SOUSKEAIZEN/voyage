"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'next/navigation';

// ARCHITECTURE: The centralized state engine for the Ephemeral Mesh
const AbyssContext = createContext(null);

export const useAbyss = () => useContext(AbyssContext);

export const AbyssProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const params = useParams();
    const eventSlug = params?.eventSlug; 

    useEffect(() => {
        const contextStr = '[Abyss Provider]';
        console.log(`${contextStr} Step 1: Initializing Ephemeral Mesh connection sequence...`);

        // [Architecture] Dynamic Base URL extraction. 
        // We strip '/api' from the NEXT_PUBLIC_API_URL because WebSockets bind to the root HTTP server.
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const SOCKET_URL = rawUrl.replace(/\/api\/?$/, ''); 

        // [Architecture] Multi-Tier Cryptographic Extraction
        let token = null;
        if (typeof window !== 'undefined') {
            // Priority 1: Check for a scoped Guest token (if they are inside a specific Node portal)
            if (eventSlug) {
                token = localStorage.getItem(`guestToken_${eventSlug}`);
            }
            // Priority 2: Fallback to Master Admin token (if they are in the Control Plane)
            if (!token) {
                token = localStorage.getItem('adminToken');
            }
        }

        if (!token) {
            console.warn(`${contextStr} Failure Point S-1: No cryptographic token found. Halting Abyss entry.`);
            return;
        }

        console.log(`${contextStr} Step 2: Token secured. Firing authenticated handshake to ${SOCKET_URL}...`);
        
        // [Architecture] Establish the secure transport layer
        const socketInstance = io(SOCKET_URL, {
            auth: {
                token: token // This is exactly what socket.handshake.auth.token intercepts on the backend
            },
            transports: ['websocket'], // Force native WebSockets to bypass HTTP polling overhead
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketInstance.on('connect', () => {
            console.log(`${contextStr} Step 3: Mesh Uplink Established. Secure Socket ID: ${socketInstance.id}`);
            setIsConnected(true);
        });

        socketInstance.on('connect_error', (error) => {
            console.error(`${contextStr} Failure Point S-2: Handshake violently rejected by Bouncer. Reason:`, error.message);
            setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
            console.warn(`${contextStr} Mesh connection severed. Reason: ${reason}`);
            setIsConnected(false);
        });

        setSocket(socketInstance);

        // Cleanup protocol on unmount to prevent memory leaks and ghost connections
        return () => {
            console.log(`${contextStr} Unmounting provider. Purging socket connection.`);
            socketInstance.disconnect();
        };
    }, [eventSlug]);

    return (
        <AbyssContext.Provider value={{ socket, isConnected }}>
            {children}
        </AbyssContext.Provider>
    );
};
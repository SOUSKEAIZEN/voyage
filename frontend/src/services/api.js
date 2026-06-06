// --- SANITIZATION PIPELINE ---
const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').trim();
// ARCHITECT NOTE: Bulletproof URL sanitization. Prevents double /api/api appending 
// if the environment variable accidentally includes trailing slashes (e.g., /api/)
const cleanBase = rawUrl.replace(/\/+$/, ''); 
const API_URL = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

export const registerGuest = async (eventSlug, guestData) => {
    const context = `[Frontend API Service - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating guest registration payload...`, guestData);

    try {
        console.log(`${context} Step 2: Sending POST request to ${API_URL}/guests/${eventSlug}/register`);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(guestData),
        });

        console.log(`${context} Step 3: Awaiting server response... Status: ${response.status}`);
        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point L: Server rejected the registration. Reason:`, data.message);
            throw new Error(data.message || 'Registration failed at the server layer.');
        }

        console.log(`${context} Step 4: Guest registration successful! ID: ${data.guestId}`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point M): Network error or API crash.`, error.message);
        throw error;
    }
};

// --- SESSION VALIDATOR: ADMIN VAULT ---
const getValidToken = (context) => {
    if (typeof window === 'undefined') return null;

    // Extract the cryptographic token from the secure browser vault
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        console.error(`${context} Failure Point O: Cryptographic token missing! Session invalidated.`);
        throw new Error('Unauthorized: Please log in.');
    }

    return token;
};

// --- SESSION VALIDATOR: GUEST PORTAL (NEW) ---
const getValidGuestToken = (eventSlug, context) => {
    if (typeof window === 'undefined') return null;

    // [Architecture] Extracts the Node-specific Guest JWT
    const token = localStorage.getItem(`guestToken_${eventSlug}`);
    
    if (!token) {
        console.error(`${context} Failure Point O-G: Guest cryptographic token missing!`);
        throw new Error('Unauthorized: Please log in to the portal.');
    }

    return token;
};

// --- ADMIN READ PIPELINE ---
export const getAllGuests = async (eventSlug, page = 1, limit = 10, stateFilter = null) => {
    const context = `[Frontend API Service - getAllGuests - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating fetch for guest ledger. Page: ${page}, Limit: ${limit}, State: ${stateFilter}`);

    try {
        const token = getValidToken(context);

        const params = new URLSearchParams({ page: page, limit: limit });
        if (stateFilter !== null && stateFilter !== '') params.append('state', stateFilter);

        const url = `${API_URL}/guests/${eventSlug}?${params.toString()}`;
        console.log(`${context} Step 2: Sending secure GET request to ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point P: Server rejected admin fetch. Reason:`, data.message);
            throw new Error(data.message || 'Failed to fetch guests.');
        }

        console.log(`${context} Step 3: Successfully retrieved ${data.data?.length || 0} guests from backend.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point Q): Network error during admin fetch.`, error.message);
        throw error;
    }
};

export const fetchGuestDetails = async (eventSlug, guestId) => {
    const context = `[Frontend API Service - fetchGuestDetails - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating fetch for extended guest profile ID: ${guestId}`);

    try {
        const token = getValidToken(context);
        const url = `${API_URL}/guests/${eventSlug}/${guestId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point F-G8: Server rejected detail fetch.`, data.message);
            throw new Error(data.message || 'Failed to fetch extended guest details.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching guest details.`, error.message);
        throw error;
    }
};

export const updateGuestState = async (eventSlug, guestId, newState, errorLog = null) => {
    const context = `[Frontend API Service - updateGuestState - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating state transition for ${guestId} to State ${newState}`);

    try {
        const token = getValidToken(context);
        
        console.log(`${context} Step 2: Sending secure PATCH request to API...`);
        const response = await fetch(`${API_URL}/guests/${eventSlug}/${guestId}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newState, errorLog })
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point R: Server rejected state transition. Reason:`, data.message);
            throw new Error(data.message || 'Failed to update guest state.');
        }

        console.log(`${context} Step 3: State transition for ${guestId} committed successfully.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point S): Network error during state transition.`, error.message);
        throw error;
    }
};

export const fetchEventEchos = async (eventSlug) => {
    const context = `[Frontend API Service - fetchEventEchos - ${eventSlug}]`;
    console.log(`${context} Fetching Echo history...`);

    try {
        const token = getValidGuestToken(eventSlug, context);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/echos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch echo history.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const fetchGuestDirectory = async (eventSlug) => {
    const context = `[Frontend API Service - fetchGuestDirectory - ${eventSlug}]`;
    console.log(`${context} Fetching sanitized guest directory...`);

    try {
        const token = getValidGuestToken(eventSlug, context);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/directory`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch directory.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const fetchGuestEchoState = async (eventSlug) => {
    const context = `[Frontend API Service - fetchGuestEchoState - ${eventSlug}]`;
    console.log(`${context} Hydrating ephemeral mesh state...`);

    try {
        const token = getValidGuestToken(eventSlug, context);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/echos/state`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch echo state.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const fetchDirectMessages = async (eventSlug, targetId) => {
    try {
        const token = getValidGuestToken(eventSlug, 'fetchDirectMessages');
        const response = await fetch(`${API_URL}/guests/${eventSlug}/messages/${targetId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.data;
    } catch (error) {
        throw error;
    }
};

// --- GUEST PORTAL PIPELINE ---
export const loginGuest = async (eventSlug, email, accessCode) => {
    const context = `[Frontend API Service - loginGuest - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating guest portal login for ${email}`);

    try {
        console.log(`${context} Step 2: Sending POST request to ${API_URL}/guests/${eventSlug}/login`);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, accessCode }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point DD: Server rejected login. Reason:`, data.message);
            throw new Error(data.message || 'Login failed at the server layer.');
        }

        console.log(`${context} Step 3: Login successful! Retrieved guest data.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point DD): Network error or API crash.`, error.message);
        throw error;
    }
};

export const logoutAdmin = async () => {
    const context = `[Frontend API Service - logoutAdmin]`;
    console.log(`${context} Step 1: Requesting session lock dissolution.`);

    try {
        const token = getValidToken(context);

        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point: Server rejected explicit logout.`, data.message);
        } else {
            console.log(`${context} Step 2: Session lock successfully dissolved on backend.`);
        }
        
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during logout.`, error.message);
        // We still throw, but the UI should clear the local token anyway just in case.
        throw error;
    }
};

// --- RBAC MANAGEMENT API ---
export const fetchNetworkUsers = async () => {
    const context = `[Frontend API Service - fetchNetworkUsers]`;
    try {
        // Assuming API_URL and getValidToken are already defined in your api.js
        const token = getValidToken(context); 
        
        const response = await fetch(`${API_URL}/tenants/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Replaced handleResponse with standard inline JSON parsing
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch network users.');
        }

        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching users.`, error.message);
        throw error;
    }
};

// --- RBAC PROVISIONING API ---
export const fetchOrganizations = async () => {
    const context = `[Frontend API Service - fetchOrganizations]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/organizations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch organizations.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching orgs.`, error.message);
        throw error;
    }
};

export const createOrganization = async (payload) => {
    const context = `[Frontend API Service - createOrganization]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/organizations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) // Expects { name }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to mint organization.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error creating org.`, error.message);
        throw error;
    }
};

// --- RBAC DESTRUCTION API ---
export const deleteOrganization = async (orgId) => {
    const context = `[Frontend API Service - deleteOrganization]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/organizations/${orgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to purge organization.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const deleteNetworkUser = async (userId) => {
    const context = `[Frontend API Service - deleteNetworkUser]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to purge identity.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const removeStaffFromEvent = async (payload) => {
    const context = `[Frontend API Service - removeStaffFromEvent]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/staff/assign`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) 
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to sever staff link.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE:`, error.message);
        throw error;
    }
};

export const provisionNetworkUser = async (payload) => {
    const context = `[Frontend API Service - provisionNetworkUser]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to provision user.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error provisioning user.`, error.message);
        throw error;
    }
};

// --- RBAC ASSIGNMENT API ---
export const assignStaffToEvent = async (payload) => {
    const context = `[Frontend API Service - assignStaffToEvent]`;
    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/tenants/staff/assign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) // Expects { admin_id, event_id }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to assign staff to the node.');
        return data;
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error assigning staff.`, error.message);
        throw error;
    }
};

export const resendAccessCode = async (eventSlug, email) => {
    const context = `[Frontend API Service - resendAccessCode - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating code recovery for ${email}`);

    try {
        const response = await fetch(`${API_URL}/guests/${eventSlug}/resend-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point R-F1: Server rejected code resend.`, data.message);
            throw new Error(data.message || 'Failed to resend access code.');
        }

        console.log(`${context} Step 2: Code recovery network dispatch successful.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during code recovery.`, error.message);
        throw error;
    }
};

// ARCHITECT NOTE: The newly secured Guest Status interceptor
export const fetchGuestStatus = async (eventSlug, guestId) => {
    const context = `[Frontend API Service - fetchGuestStatus - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating live status sync for guest ID: ${guestId}`);

    try {
        // [Architecture] Inject the Node-specific Guest JWT
        const token = getValidGuestToken(eventSlug, context);
        
        console.log(`${context} Step 2: Sending GET request to ${API_URL}/guests/${eventSlug}/${guestId}/status`);
        
        const response = await fetch(`${API_URL}/guests/${eventSlug}/${guestId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point GG: Server rejected status sync. Reason:`, data.message);
            throw new Error(data.message || 'Failed to fetch live status.');
        }

        console.log(`${context} Step 3: Live status synced successfully! Current State: ${data.currentState}`);
        return data.currentState;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point GG): Network error during status sync.`, error.message);
        throw error;
    }
};

// --- EVENT MANAGEMENT PIPELINES ---
export const fetchPublicEvents = async () => {
    const context = '[Frontend API Service - fetchPublicEvents]';
    console.log(`${context} Step 1: Fetching public events directory from ${API_URL}/events`);

    try {
        const response = await fetch(`${API_URL}/events`, {
            method: 'GET',
            cache: 'no-store' // [Architecture] Bypasses Next.js static caching to prevent Phantom Data
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F1: Failed to fetch public events.`, data.message);
            throw new Error(data.message || 'Failed to fetch public events.');
        }

        return data.data; 

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during event fetch.`, error.message);
        throw error;
    }
};

export const fetchAllAdminEvents = async () => {
    const context = '[Frontend API Service - fetchAllAdminEvents]';
    console.log(`${context} Step 1: Fetching master ledger of all tenants.`);

    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/events/admin/all`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F11: Failed to fetch master ledger.`, data.message);
            throw new Error(data.message || 'Failed to fetch the master ledger.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching master ledger.`, error.message);
        throw error;
    }
};

export const fetchEventDetails = async (eventSlug) => {
    const context = `[Frontend API Service - fetchEventDetails - ${eventSlug}]`;
    console.log(`${context} Step 1: Fetching specific event metadata.`);

    try {
        const response = await fetch(`${API_URL}/events/${eventSlug}`, {
            method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F2: Failed to fetch event details.`, data.message);
            throw new Error(data.message || 'Event not found.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching event ${eventSlug}.`, error.message);
        throw error;
    }
};

// --- ITINERARY ENGINE PIPELINES ---
export const fetchEventSchedule = async (eventSlug) => {
    const context = `[Frontend API Service - fetchEventSchedule - ${eventSlug}]`;
    console.log(`${context} Step 1: Fetching raw itinerary payload.`);

    try {
        const response = await fetch(`${API_URL}/events/${eventSlug}/schedule`, {
            method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-SCH-F1: Failed to fetch schedule.`, data.message);
            throw new Error(data.message || 'Failed to fetch the itinerary.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching schedule for ${eventSlug}.`, error.message);
        throw error;
    }
};

export const updateEventSchedule = async (eventSlug, scheduleData) => {
    const context = `[Frontend API Service - updateEventSchedule - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating Master Itinerary Override payload...`, scheduleData);

    try {
        const token = getValidToken(context);

        // ARCHITECT NOTE: This is a PUT request to trigger an atomic wipe-and-replace on the backend
        const response = await fetch(`${API_URL}/events/${eventSlug}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ schedule: scheduleData }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-SCH-F2: Server rejected schedule synchronization.`, data.message);
            throw new Error(data.message || 'Failed to synchronize schedule.');
        }

        console.log(`${context} Step 2: Itinerary successfully synchronized!`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error synchronizing schedule.`, error.message);
        throw error;
    }
};

// --- VECTOR 2: TELEMETRY & KILL SWITCH PIPELINES ---
export const fetchEventTelemetry = async (eventSlug) => {
    const context = `[Frontend API Service - fetchEventTelemetry - ${eventSlug}]`;
    console.log(`${context} Step 1: Fetching live telemetry data.`);

    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/events/${eventSlug}/telemetry`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point TEL-F1: Failed to fetch telemetry.`, data.message);
            throw new Error(data.message || 'Failed to fetch telemetry data.');
        }

        return data.data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching telemetry.`, error.message);
        throw error;
    }
};

export const triggerMeshDissolve = async (eventSlug) => {
    const context = `[Frontend API Service - triggerMeshDissolve - ${eventSlug}]`;
    console.log(`${context} !!! Step 1: Initiating KILL SWITCH for event ${eventSlug}. !!!`);

    try {
        const token = getValidToken(context);
        const response = await fetch(`${API_URL}/events/${eventSlug}/dissolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point DISSOLVE-F1: Server rejected dissolve command.`, data.message);
            throw new Error(data.message || 'Failed to execute Kill Switch.');
        }

        console.log(`${context} Step 2: Mesh successfully dissolved.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during dissolve protocol.`, error.message);
        throw error;
    }
};

export const createEvent = async (eventData) => {
    const context = '[Frontend API Service - createEvent]';
    console.log(`${context} Step 1: Initiating event creation payload...`, eventData);

    try {
        const token = getValidToken(context);

        const response = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F3: Server rejected event creation.`, data.message);
            throw new Error(data.message || 'Failed to create new event.');
        }

        console.log(`${context} Step 2: Event created successfully!`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during event creation.`, error.message);
        throw error;
    }
};

export const updateEventDetails = async (currentSlug, eventData) => {
    const context = `[Frontend API Service - updateEventDetails - ${currentSlug}]`;
    console.log(`${context} Step 1: Initiating event update payload...`, eventData);

    try {
        const token = getValidToken(context);

        const response = await fetch(`${API_URL}/events/${currentSlug}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F4: Server rejected event update.`, data.message);
            throw new Error(data.message || 'Failed to update event details.');
        }

        console.log(`${context} Step 2: Event updated successfully!`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during event update.`, error.message);
        throw error;
    }
};

export const fetchGlobalGuests = async (page = 1, limit = 50) => {
    const context = '[Frontend API Service - fetchGlobalGuests]';
    console.log(`${context} Step 1: Fetching master global guest directory.`);

    try {
        const token = getValidToken(context);

        const response = await fetch(`${API_URL}/guests/admin/all?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point: Failed to fetch global guests.`, data.message);
            throw new Error(data.message || 'Failed to fetch the global guest directory.');
        }

        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error fetching global guests.`, error.message);
        throw error;
    }
};

export const deleteEvent = async (eventSlug) => {
    const context = `[Frontend API Service - deleteEvent - ${eventSlug}]`;
    console.log(`${context} Step 1: Initiating destructive purge protocol for tenant ${eventSlug}...`);

    try {
        const token = getValidToken(context);

        const response = await fetch(`${API_URL}/events/${eventSlug}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn(`${context} Failure Point EV-F5: Server rejected event deletion.`, data.message);
            throw new Error(data.message || 'Failed to delete the event.');
        }

        console.log(`${context} Step 2: Tenant environment successfully obliterated.`);
        return data;

    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Network error during event deletion.`, error.message);
        throw error;
    }
};
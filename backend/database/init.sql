-- Enable the UUID extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ARCHITECT NOTE: Clearing the old architecture
-- CASCADE ensures any old dependencies are also cleanly wiped
DROP TABLE IF EXISTS event_schedules CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS guests CASCADE;

-- ==========================================
-- 1. THE GLOBAL IDENTITY VAULT
-- ==========================================
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. THE EVENT JUNCTION (THE TICKET)
-- ==========================================
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relational Links
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    
    -- Security
    access_code VARCHAR(255) NOT NULL,
    
    -- Event-Specific Logistics & Verification
    id_number VARCHAR(100) NOT NULL,
    id_document_url TEXT NOT NULL,
    dietary_restrictions TEXT,
    
    -- State Machine & Logging
    current_state INTEGER DEFAULT 0, 
    error_log TEXT,                  
    
    -- Audit Trails
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- ARCHITECT NOTE: Prevent a guest from registering for the exact same event twice!
    UNIQUE(guest_id, event_id)
);

-- ==========================================
-- 3. THE ITINERARY ENGINE (EVENT SCHEDULES)
-- ==========================================
CREATE TABLE event_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relational Links
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    
    -- Temporal Core Data
    title VARCHAR(255) NOT NULL,
    description TEXT,
    speaker_name VARCHAR(255),
    location VARCHAR(255),
    
    -- ARCHITECT NOTE: Strict UTC enforcement. The MSaaS Edge/Client will localize this.
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
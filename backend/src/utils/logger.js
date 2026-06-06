/**
 * Custom Logging Utility
 * Ensures every step of the application has a traceable footprint.
 */

const formatMessage = (level, context, message) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}]: ${message}`;
};

const logger = {
    info: (context, message) => {
        console.log(formatMessage('INFO', context, message));
    },
    
    warn: (context, message) => {
        console.warn(formatMessage('WARN', context, message));
    },
    
    error: (context, message, errorObj = null) => {
        console.error(formatMessage('ERROR', context, message));
        // If an actual Error object is passed (like a database crash), print the stack trace
        if (errorObj && errorObj.stack) {
            console.error(errorObj.stack);
        }
    },
    
    // Specific state change logger for our MICE application
    stateChange: (guestId, oldState, newState) => {
        const message = `Guest ${guestId} transitioned from State ${oldState} to State ${newState}`;
        console.log(formatMessage('STATE_CHANGE', 'GuestLedger', message));
    }
};

module.exports = logger;
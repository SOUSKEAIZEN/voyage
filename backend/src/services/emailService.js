const logger = require('../utils/logger');

// ARCHITECT NOTE: The transport layer has been completely overhauled to use the native Gmail REST API via HTTPS (Port 443).
// Render blocks standard SMTP ports (465, 587) on free tiers, causing ENETUNREACH timeouts. 
// This architecture natively bypasses those firewall rules by communicating directly with Google's OAuth2 endpoints.
// Strict Requirement: GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN must be in environment variables.

logger.info('[EmailService]', 'Step 0: Initializing REST-based Gmail API transport module...');

// --- AUTHENTICATION PIPELINE ---
const getAccessToken = async (context) => {
    logger.info(context, 'Step 2.1: Requesting fresh OAuth2 Access Token from Google...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GMAIL_CLIENT_ID,
            client_secret: process.env.GMAIL_CLIENT_SECRET,
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        logger.error(context, `Failure Point E-AUTH: Failed to mint access token. Details: ${JSON.stringify(data)}`);
        throw new Error('OAuth2 Token generation failed.');
    }

    return data.access_token;
};

// --- MIME ENCODER ---
const createBase64Email = (to, subject, htmlContent) => {
    // Construct standard MIME email payload
    const emailParts = [
        `From: ${process.env.GMAIL_USER}`,
        `To: ${to}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlContent,
    ];

    const rawEmail = emailParts.join('\n');
    
    // Google requires URL-safe Base64 encoding
    return Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

// --- GMAIL API DISPATCHER ---
const dispatchEmail = async (context, to, subject, htmlContent) => {
    const accessToken = await getAccessToken(context);
    const encodedEmail = createBase64Email(to, subject, htmlContent);

    logger.info(context, 'Step 2.2: Transmitting Base64 payload to Gmail REST endpoint (Port 443)...');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
        logger.error(context, `Failure Point E-DISPATCH: Google REST API rejected payload. Details: ${JSON.stringify(data)}`);
        throw new Error('Gmail REST API rejected the dispatch.');
    }

    return data;
};


// --- 1. ACCESS CODE PIPELINE ---
const sendAccessCode = async (email, fullName, accessCode, eventName) => {
    const context = `[EmailService - Access - ${eventName}]`;
    logger.info(context, `Step 1: Preparing REST email payload for ${email}`);

    try {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
            logger.error(context, 'Failure Point E1: Missing OAuth2 environment variables.');
            throw new Error('Email OAuth2 credentials not configured.');
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Welcome to ${eventName}, ${fullName}!</h2>
                <p>Your registration is confirmed. To track your verification status and access your dashboard for <strong>${eventName}</strong>, use the secure code below:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="letter-spacing: 5px; color: #2563eb; margin: 0;">${accessCode}</h1>
                </div>
                <p>Keep this code safe. Do not share it with anyone.</p>
                <br/>
                <p>Best regards,<br/><strong>The ${eventName} Administration Team</strong></p>
            </div>
        `;

        const result = await dispatchEmail(context, email, `Your Access Code for ${eventName}`, htmlContent);

        logger.info(context, `Step 3: SUCCESS. REST transporter verified delivery. Google Thread ID: ${result.threadId}`);
        return true;

    } catch (error) {
        logger.error(context, `Failure Point E2: Network or REST dispatch pipeline shattered. Details: ${error.message}`);
        throw error; 
    }
};

// --- 2. THE ABYSS DISSOLVE PIPELINE ---
const sendMeshExport = async (targetEmail, targetName, eventName, connections) => {
    const context = `[EmailService - Abyss Export - ${eventName}]`;
    logger.info(context, `Step 1: Preparing Mesh Export REST payload for ${targetEmail} with ${connections.length} echos.`);

    try {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
            logger.error(context, 'Failure Point E3: Missing OAuth2 environment variables.');
            throw new Error('Email OAuth2 credentials not configured.');
        }

        let connectionsHtml = '';
        if (connections.length === 0) {
            connectionsHtml = '<p>You did not finalize any echos during this event.</p>';
        } else {
            connectionsHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #111827; color: #ffffff; text-align: left;">
                            <th style="padding: 12px; border: 1px solid #374151;">Name</th>
                            <th style="padding: 12px; border: 1px solid #374151;">Email</th>
                            <th style="padding: 12px; border: 1px solid #374151;">Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${connections.map(conn => `
                            <tr>
                                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${conn.full_name}</strong></td>
                                <td style="padding: 12px; border: 1px solid #e5e7eb;"><a href="mailto:${conn.email}" style="color: #2563eb;">${conn.email}</a></td>
                                <td style="padding: 12px; border: 1px solid #e5e7eb;">${conn.phone || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #111827; margin: 0;">${eventName}</h1>
                    <p style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">The Abyss Dissolved</p>
                </div>
                
                <p>Hello ${targetName},</p>
                <p>The event has concluded, and the ephemeral network has been permanently dissolved. Below is the finalized graph of the echos you secured during your session.</p>
                
                ${connectionsHtml}
                
                <br/>
                <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 40px;">
                    This is an automated transmission from the Nexus Control Plane.
                </p>
            </div>
        `;

        const result = await dispatchEmail(context, targetEmail, `Your Connections from ${eventName} - The Abyss`, htmlContent);

        logger.info(context, `Step 3: SUCCESS. Abyss Export delivered to ${targetEmail}. Google Thread ID: ${result.threadId}`);
        return true;

    } catch (error) {
        logger.error(context, `Failure Point E4: Network failure on Mesh Export. Details: ${error.message}`);
        throw error; 
    }
};

module.exports = {
    sendAccessCode,
    sendMeshExport
};
const logger = require('../utils/logger');
require('dotenv').config();

const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional: Required only if your Vercel project is under a Team account

// Helper to construct the API URL with the optional Team ID query parameter
const getVercelUrl = (endpoint) => {
    let url = `https://api.vercel.com${endpoint}`;
    if (TEAM_ID) {
        url += `?teamId=${TEAM_ID}`;
    }
    return url;
};

// --- ARCHITECTURE: DevOps Edge Injector ---
const addCustomDomain = async (domain) => {
    const context = '[VercelService - AddDomain]';
    
    if (!VERCEL_TOKEN || !PROJECT_ID) {
        logger.warn(context, 'Vercel API credentials missing from environment. Edge routing deployment skipped (Local Dev Mode assumed).');
        return false;
    }

    // Clean the domain string (strip protocols and trailing slashes)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    
    logger.info(context, `Step 1: Initiating automated Edge routing configuration for domain: ${cleanDomain}`);

    try {
        const url = getVercelUrl(`/v10/projects/${PROJECT_ID}/domains`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: cleanDomain
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Vercel returns 400 if the domain is already assigned to another project
            logger.warn(context, `Failure Point V1: Vercel Edge proxy rejected domain injection. Reason: ${data.error?.message || 'Unknown'}`);
            throw new Error(`Edge Deployment Failed: ${data.error?.message || 'Invalid domain configuration'}`);
        }

        logger.info(context, `Step 2: Success. Vercel edge proxy is now actively routing ${cleanDomain} to this application.`);
        return true;

    } catch (error) {
        logger.error(context, 'CRITICAL FAILURE during automated edge deployment.', error);
        throw error;
    }
};

// --- ARCHITECTURE: DevOps Edge Purger ---
const removeCustomDomain = async (domain) => {
    const context = '[VercelService - RemoveDomain]';
    
    if (!VERCEL_TOKEN || !PROJECT_ID) {
        logger.warn(context, 'Vercel API credentials missing. Edge routing purge skipped.');
        return false;
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    logger.info(context, `Step 1: Initiating destructive purge of Edge routing for domain: ${cleanDomain}`);

    try {
        const url = getVercelUrl(`/v9/projects/${PROJECT_ID}/domains/${cleanDomain}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            // If it returns 404, it's already gone, which is fine for a purge
            if (response.status === 404) {
                logger.info(context, `Domain ${cleanDomain} not found on Vercel. Purge considered successful.`);
                return true;
            }
            logger.warn(context, `Failure Point V2: Vercel edge proxy rejected purge command. Reason: ${data.error?.message}`);
            throw new Error(`Edge Purge Failed: ${data.error?.message}`);
        }

        logger.info(context, `Step 2: Success. Vercel edge routing for ${cleanDomain} has been obliterated.`);
        return true;

    } catch (error) {
        logger.error(context, 'CRITICAL FAILURE during automated edge routing purge.', error);
        throw error;
    }
};

module.exports = {
    addCustomDomain,
    removeCustomDomain
};
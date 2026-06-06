"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link'; 
import { motion } from 'framer-motion';
import { loginGuest, resendAccessCode } from '../../../services/api'; 

export default function GuestPortalLogin() {
    const params = useParams();
    const eventSlug = params.eventSlug;
    const context = `[GuestPortalLogin Component - ${eventSlug}]`;
    
    const router = useRouter();
    
    const [formData, setFormData] = useState({ email: '', accessCode: '' });
    const [status, setStatus] = useState('idle'); // idle | loading | error | success
    const [message, setMessage] = useState('');
    
    // [Architecture] State to track the rate-limiting cooldown period (in seconds)
    const [cooldown, setCooldown] = useState(0);

    // [Architecture] Lifecycle hook to manage the countdown timer independently of main thread blocking
    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log(`${context} Step 1: Guest login attempt triggered for ${formData.email}`);
        setStatus('loading');
        setMessage('');

        if (!formData.email || !formData.accessCode) {
            console.warn(`${context} Failure Point CC: Missing email or access code.`);
            setStatus('error');
            setMessage('Please provide both your registered email and your 6-character access code.');
            return;
        }

        try {
            console.log(`${context} Step 3: Hitting backend authentication endpoint for event: ${eventSlug}...`);
            
            const result = await loginGuest(eventSlug, formData.email, formData.accessCode);
            
            console.log(`${context} Step 4: Cryptographic token received. Securing session...`);
            
            // [Architecture] Store the JWT securely, scoped strictly to this specific Node
            localStorage.setItem(`guestToken_${eventSlug}`, result.token);
            
            // We still store the user data for UI hydration purposes, but the true authority is the JWT
            sessionStorage.setItem('guestData', JSON.stringify(result.data));

            console.log(`${context} Step 5: Redirecting to secure guest dashboard.`);
            router.push(`/${eventSlug}/portal/dashboard`);

        } catch (error) {
            console.error(`${context} CRITICAL FAILURE (Failure Point DD):`, error.message);
            setStatus('error');
            setMessage(error.message || 'Invalid email or access code. Please try again.');
        }
    };

    // ARCHITECT NOTE: Handler for the code recovery mechanism
    const handleResendCode = async () => {
        console.log(`${context} Step 1: Guest code recovery triggered.`);
        
        // Block execution if the cooldown is active
        if (cooldown > 0) {
            console.warn(`${context} Failure Point R-THROTTLE: Request rejected. Cooldown active for ${cooldown}s.`);
            return;
        }

        if (!formData.email) {
            console.warn(`${context} Failure Point R-UI: Email missing for recovery.`);
            setStatus('error');
            setMessage('Please enter your registered email address above to resend the code.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            console.log(`${context} Step 2: Hitting backend code recovery endpoint...`);
            await resendAccessCode(eventSlug, formData.email);
            
            console.log(`${context} Step 3: Code recovery request successful. Engaging 60s cooldown.`);
            setStatus('success');
            setMessage('A new access code has been dispatched to your email.');
            setCooldown(60); // Initialize the throttle
        } catch (error) {
            console.error(`${context} CRITICAL FAILURE (Failure Point R-UI-Fail):`, error.message);
            setStatus('error');
            setMessage(error.message || 'Failed to resend access code. Please verify your email or try again.');
            setCooldown(60); // Engage throttle even on error to prevent spamming the error state
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="max-w-md w-full z-10 flex flex-col items-center relative"
            >
                
                {/* [Architecture] Mobile UI: Adjusted margin-bottom to pull the card up slightly on small screens */}
                <div className="mb-6 sm:mb-8 w-full flex justify-center">
                    <Link 
                        href={`/${eventSlug}`} 
                        className="inline-flex items-center text-[10px] sm:text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--tenant-text)] opacity-70 hover:opacity-100 transition-opacity bg-black/20 px-4 py-2 border border-white/10 backdrop-blur-md shadow-lg"
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                    >
                        <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Return to Event Hub
                    </Link>
                </div>

                <div 
                    className="group relative overflow-hidden w-full bg-black/40 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] border border-white/[0.08] p-6 sm:p-10 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                    style={{ borderRadius: 'var(--tenant-radius)' }}
                >
                    
                    <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[200%] transition-all duration-700 ease-out z-0 pointer-events-none transform-gpu" style={{ backgroundImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--tenant-accent) 15%, transparent), transparent)' }} />

                    <div className="relative z-10">
                        <div className="text-center mb-8 sm:mb-10">
                            <div 
                                className="w-12 h-12 sm:w-14 sm:h-14 bg-white/[0.03] flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-white/[0.08] shadow-inner"
                                style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--tenant-text)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--tenant-text)] mb-2 tracking-tight drop-shadow-md">Guest Portal</h1>
                            <p className="text-[9px] sm:text-[10px] text-[var(--tenant-text)] opacity-50 font-semibold uppercase tracking-[0.2em]">{eventSlug.replace(/-/g, ' ')}</p>
                        </div>

                        {/* [Architecture] Mobile UI: Tighter vertical spacing between inputs */}
                        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                            
                            {status === 'error' && (
                                <div 
                                    className="flex items-start p-3 sm:p-4 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 shadow-sm tracking-wide"
                                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                                >
                                    <svg className="w-4 h-4 text-rose-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="leading-snug">{message}</span>
                                </div>
                            )}

                            {status === 'success' && (
                                <div 
                                    className="flex items-start p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 shadow-sm transition-all tracking-wide"
                                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                                >
                                    <svg className="w-4 h-4 text-emerald-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="leading-snug">{message}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--tenant-text)] opacity-60 mb-2 uppercase tracking-[0.15em] ml-1">Registered Email</label>
                                {/* [Architecture] Wrapper div with relative positioning for inline button */}
                                <div className="relative">
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        className="w-full pl-4 pr-24 sm:pl-5 sm:pr-28 py-3 sm:py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:ring-1 focus:border-white/30 outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] sm:text-sm [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(0,0,0,0.8)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--tenant-text)] [&:-webkit-autofill]:transition-none" 
                                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                                        placeholder="guest@enterprise.com" 
                                        disabled={status === 'loading'}
                                    />
                                    {/* [Architecture] Inline dispatch button mapped to handleResendCode */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            console.log(`${context} Action: Inline Send Code button clicked.`);
                                            handleResendCode();
                                        }}
                                        disabled={status === 'loading' || !formData.email || cooldown > 0}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 text-[var(--tenant-text)] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                                        style={{ borderRadius: 'calc(var(--tenant-btn-radius) - 2px)' }}
                                    >
                                        {status === 'loading' ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Code'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--tenant-text)] opacity-60 mb-2 uppercase tracking-[0.15em] ml-1">6-Character Access Code</label>
                                <input 
                                    type="password" 
                                    name="accessCode"
                                    value={formData.accessCode} 
                                    onChange={handleChange} 
                                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:ring-1 focus:border-white/30 outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] uppercase tracking-[0.3em] font-mono text-[16px] sm:text-sm [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(0,0,0,0.8)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--tenant-text)] [&:-webkit-autofill]:transition-none" 
                                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                                    placeholder="••••••" 
                                    maxLength={6}
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className="w-full py-3.5 px-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] transform transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center group text-xs sm:text-sm tracking-wide mt-2 font-bold uppercase"
                                style={{ backgroundColor: 'var(--tenant-text)', color: 'var(--tenant-bg)', borderRadius: 'var(--tenant-btn-radius)' }}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" style={{ color: 'var(--tenant-bg)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Access Secure Dashboard
                                        <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-5 sm:pt-6 border-t border-white/[0.05] text-center">
                            <p className="text-[10px] sm:text-[11px] text-[var(--tenant-text)] opacity-60 font-medium flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-1.5 tracking-wide">
                                <span>Didn't receive your access code?</span>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={status === 'loading' || cooldown > 0}
                                    className="font-bold opacity-100 hover:opacity-70 transition-opacity disabled:cursor-not-allowed underline decoration-white/20 underline-offset-4 py-2 sm:py-0 px-4 sm:px-0"
                                >
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend it'}
                                </button>
                            </p>
                        </div>

                    </div>
                </div>
            </motion.div>
        </main>
    );
}
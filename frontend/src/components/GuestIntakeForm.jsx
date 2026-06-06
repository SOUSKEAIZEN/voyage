"use client";

import { useState } from 'react';
import { registerGuest } from '../services/api';

// ARCHITECT NOTE: We receive the eventSlug from the parent page wrapper
export default function GuestIntakeForm({ eventSlug }) {
    const context = `[GuestIntakeForm Component - ${eventSlug}]`;

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        idNumber: '',
        idDocumentUrl: '',
        dietaryRestrictions: ''
    });

    const [status, setStatus] = useState('idle'); 
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(`${context} Step 1: Form submission triggered by user.`);
        setStatus('loading');
        setMessage('');

        if (!formData.fullName || !formData.email || !formData.idNumber || !formData.idDocumentUrl) {
            console.warn(`${context} Failure Point N: Frontend validation failed. Missing required fields.`);
            setStatus('error');
            setMessage('Please fill out all required fields (Name, Email, ID Number, ID URL).');
            return;
        }

        try {
            console.log(`${context} Step 3: Validation passed. Handing off to API Service Layer for event: ${eventSlug}`);
            
            // ARCHITECT NOTE: Passing the eventSlug down to the service layer
            const result = await registerGuest(eventSlug, formData);
            
            console.log(`${context} Step 4: UI received success confirmation. Guest State is initialized at 1.`);
            setStatus('success');
            setMessage(`Registration successful! Your secure Guest ID is: ${result.guestId}`);
            
            setFormData({
                fullName: '', email: '', phone: '', idNumber: '', idDocumentUrl: '', dietaryRestrictions: ''
            });

        } catch (error) {
            console.error(`${context} CRITICAL FAILURE: Caught error from API service.`, error.message);
            setStatus('error');
            setMessage(error.message || 'An error occurred during registration. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 text-left p-2 sm:p-8">
            {/* [Architecture] Mobile UI: Adjusted vertical rhythm for tighter mobile screens */}
            
            {/* Minimalist Feedback Banners (Semantic Colors Retained for UX) */}
            {status === 'error' && (
                <div 
                    className="flex items-start p-3 md:p-4 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 shadow-sm tracking-wide"
                    style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                >
                    <svg className="w-4 h-4 text-rose-500 mr-2 md:mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="font-bold leading-snug">{message}</p>
                </div>
            )}
            
            {status === 'success' && (
                <div 
                    className="flex flex-col p-5 md:p-6 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)] text-center"
                    style={{ borderRadius: 'var(--tenant-radius)' }}
                >
                    <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/10 mb-3 border border-emerald-500/20">
                        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-sm md:text-base font-bold text-emerald-400 mb-1">{message}</p>
                    <p className="text-[11px] md:text-xs text-emerald-500/80 tracking-wide font-medium">Check your email for your 6-character access code.</p>
                </div>
            )}

            {/* Input Grid - Optimized for MSaaS Theming */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 md:gap-y-6">
                {/* [Architecture] Mobile UI: Inputs use text-[16px] specifically to bypass iOS auto-zoom bug on focus, scaling back to text-sm on desktop. */}
                <div className="space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] md:text-sm focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="Satoshi Nakamoto" disabled={status === 'loading'} />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] md:text-sm focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="satoshi@network.com" disabled={status === 'loading'} />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">Phone Number</label>
                    {/* [Architecture] Mobile UI: Switched to type="tel" to trigger correct mobile numpad */}
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] md:text-sm focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="+1 234 567 8900" disabled={status === 'loading'} />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">ID Number</label>
                    <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] font-mono text-[16px] md:text-sm tracking-wider focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="Passport / Govt ID" disabled={status === 'loading'} />
                </div>

                <div className="md:col-span-2 space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">Identity Document URL</label>
                    {/* [Architecture] Mobile UI: Switched to type="url" for specialized keyboard layouts */}
                    <input type="url" name="idDocumentUrl" value={formData.idDocumentUrl} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] md:text-sm focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="https://secure.storage.com/id-scan.jpg" disabled={status === 'loading'} />
                </div>

                <div className="md:col-span-2 space-y-1.5 md:space-y-2">
                    <label className="block text-[11px] md:text-[10px] font-bold text-[var(--tenant-text)] opacity-60 uppercase tracking-[0.2em] ml-1 md:ml-2">Dietary Restrictions</label>
                    <input type="text" name="dietaryRestrictions" value={formData.dietaryRestrictions} onChange={handleChange} 
                        className="w-full px-4 md:px-5 py-3.5 bg-black/40 backdrop-blur-sm border border-white/[0.1] focus:outline-none transition-all duration-300 shadow-inner hover:bg-black/60 text-[var(--tenant-text)] text-[16px] md:text-sm focus:ring-1 focus:ring-[var(--tenant-primary)] focus:border-[var(--tenant-primary)] placeholder-white/30" 
                        style={{ borderRadius: 'var(--tenant-btn-radius)' }}
                        placeholder="e.g. Vegetarian, Gluten-free" disabled={status === 'loading'} />
                </div>
            </div>

            <button type="submit" disabled={status === 'loading'} 
                className="w-full mt-8 md:mt-10 font-bold py-4 md:py-4 px-6 shadow-[0_0_25px_rgba(255,255,255,0.1)] transform transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center group text-[11px] md:text-xs uppercase tracking-[0.2em]"
                style={{ backgroundColor: 'var(--tenant-text)', color: 'var(--tenant-bg)', borderRadius: 'var(--tenant-btn-radius)' }}
            >
                
                {status === 'loading' ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" style={{ color: 'var(--tenant-bg)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Encrypting...
                    </>
                ) : (
                    <>
                        Complete Registration
                        <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                )}
            </button>
        </form>
    );
}
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';

const EncryptedText = dynamic(
    () => import('@/components/ui/encrypted-text').then((mod) => mod.EncryptedText),
    { ssr: false }
);

export default function MasterAdminLogin() {
    const context = '[Master Admin Login]';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // [Architecture] UX State Toggle
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        if (!email.trim() || !password.trim()) {
            setError('Both identity and security key are required.');
            setLoading(false);
            return;
        }

        console.log(`${context} Step 1: Initiating secure handshake with Control Plane...`);

        try {
            // [Architecture] Mirroring the URL Sanitization Pipeline from api.js
            const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').trim();
            const cleanBase = rawUrl.replace(/\/+$/, ''); 
            const apiUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
            
            console.log(`${context} Step 1.5: Dispatching to sanitized URL -> ${apiUrl}/auth/login`);

            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.warn(`${context} Failure Point Auth-UI-1: Handshake rejected. Server responded with:`, data.message);
                setError(data.message || 'Invalid credentials.');
                setLoading(false);
                return;
            }

            console.log(`${context} Step 2: Cryptographic token received. Securing session...`);

            // [Architecture] Store the JWT token securely
            localStorage.setItem('adminToken', data.token);
            
            // Redirecting to the Master Control Plane.
            setTimeout(() => {
                router.push('/admin/');
            }, 500);

        } catch (err) {
            console.error(`${context} CRITICAL FAILURE (Failure Point Auth-UI-2): Network boundary severed.`, err.message);
            // ARCHITECT NOTE: Exposing err.message so we can see if it's a CORS, Mixed Content, or DNS issue on Vercel.
            setError(`Uplink Failed: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-200 overflow-hidden relative selection:bg-cyan-500/30">
            
            <AmbientAurora />
            <InteractiveAura />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="w-full max-w-md z-10"
            >
                <div className="mb-10 text-center flex justify-center">
                    <Link href="/" className="inline-flex items-center text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-400 hover:text-white transition-colors bg-white/[0.02] px-4 py-2 rounded-full border border-white/[0.05] backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                        <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Public Directory
                    </Link>
                </div>

                <div className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[32px] p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(34,211,238,0.1)]">
                    
                    <div className="absolute inset-y-0 -left-[150%] w-[150%] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -skew-x-[30deg] opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out z-0 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-center mb-8">
                            <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center border border-white/[0.08] shadow-inner transform rotate-3">
                                <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                        
                        <h1 className="text-3xl font-medium text-center text-white tracking-tight mb-2 min-h-[1.2em]">
                            <EncryptedText
                                text="Master Override"
                                encryptedClassName="text-zinc-600 font-mono tracking-normal"
                                revealedClassName="text-white"
                                revealDelayMs={50} 
                            />
                        </h1>
                        <p className="text-center text-zinc-500 text-xs font-normal mb-10 leading-relaxed tracking-wide">Authorized access only to the Master Control Plane.</p>

                        {error && (
                            <div className="mb-8 flex items-center p-4 bg-rose-500/5 border border-rose-500/10 text-rose-400/80 text-xs font-medium rounded-2xl tracking-wide">
                                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Identity (Email)</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@nexus.com"
                                    className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-6 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all tracking-wide text-sm shadow-inner placeholder-zinc-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">Security Key</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all tracking-[0.4em] font-mono text-sm shadow-inner placeholder-zinc-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors focus:outline-none p-2"
                                        title={showPassword ? "Hide security key" : "Reveal security key"}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-black rounded-full font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] active:scale-[0.98] mt-4"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    'Authenticate'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
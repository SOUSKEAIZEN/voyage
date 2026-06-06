"use client";

import { useEffect, useState, memo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEventDetails } from '../../services/api';
import { AmbientAurora } from '@/components/ui/ambient-aurora';
import { InteractiveAura } from '@/components/ui/interactive-aura';

// [Architecture] Client-Side Mobile Detector
// Hydration-safe hook to isolate mobile logic without breaking Server-Side Rendering or desktop styles.
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    return isMobile;
};

// [Architecture] Stateful Cinematic Hero Engine (Moved to Global Layout)
// [Architecture] Mobile Hardware Degradation: Halts intervals, flattens image arrays, and disables GPU scale transforms on touch devices to save battery.
const HeroSlideshow = memo(({ images, isMobile }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadedImages, setLoadedImages] = useState({});

    useEffect(() => {
        // Halt interval completely on mobile; static first image is sufficient
        if (!images || images.length <= 1 || isMobile) return; 
        const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % images.length), 5000);
        return () => clearInterval(timer);
    }, [images, isMobile]);

    if (!images || images.length === 0) return null;

    // Aggressive DOM pruning for mobile: Only render the active image instead of the full array
    const imagesToRender = isMobile ? [images[0]] : images;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-transparent">
            {imagesToRender.map((src, index) => {
                const isActive = isMobile ? true : currentIndex === index;
                const isLoaded = !!loadedImages[src];

                return (
                    <motion.div
                        key={src}
                        initial={{ opacity: 0, scale: 1 }} 
                        animate={{ 
                            opacity: isActive && isLoaded ? 1 : 0, 
                            scale: isActive && !isMobile ? 1.05 : 1, // Disable GPU scale repaints on mobile
                            zIndex: isActive ? 10 : 0 
                        }}
                        transition={{ opacity: { duration: 1.5, ease: "easeInOut" }, scale: { duration: 10, ease: "linear" } }}
                        className="absolute inset-0 will-change-transform transform-gpu"
                    >
                        <Image 
                            src={src} 
                            alt="Event Atmosphere" 
                            fill 
                            priority={index === 0} 
                            sizes="100vw" 
                            className="object-cover object-center opacity-50" 
                            onLoad={() => setLoadedImages(prev => ({ ...prev, [src]: true }))} 
                        />
                    </motion.div>
                );
            })}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--tenant-bg)_120%)] opacity-80 z-20 transform-gpu" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--tenant-bg)]/60 to-[var(--tenant-bg)] z-20 transform-gpu" />
        </div>
    );
});
HeroSlideshow.displayName = 'HeroSlideshow';

// [Architecture] Dynamic Surface Texture Generator
const SurfaceTexture = memo(({ type }) => {
    if (!type || type === 'none') return null;

    if (type === 'grid') return <div className="absolute inset-0 z-0 pointer-events-none opacity-20 transform-gpu" style={{ backgroundImage: `linear-gradient(to right, var(--tenant-text) 1px, transparent 1px), linear-gradient(to bottom, var(--tenant-text) 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }} />;
    if (type === 'dots') return <div className="absolute inset-0 z-0 pointer-events-none opacity-20 transform-gpu" style={{ backgroundImage: `radial-gradient(var(--tenant-text) 1px, transparent 1px)`, backgroundSize: '20px 20px', maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }} />;
    if (type === 'grain') return <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.05] transform-gpu mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }} />;

    return null;
});
SurfaceTexture.displayName = 'SurfaceTexture';

export default function EventLayout({ children }) {
    const params = useParams();
    const pathname = usePathname();
    const eventSlug = params.eventSlug;
    const context = `[Event Layout Wrapper - ${eventSlug}]`;
    const isMobile = useIsMobile();

    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const data = await fetchEventDetails(eventSlug);
                setEventData(data);
            } catch (err) {
                console.error(`${context} Failed to extract theme payload. Defaulting to Abyssal Void.`, err);
                setEventData({}); 
            } finally {
                setLoading(false);
            }
        };

        if (eventSlug) loadTheme();
    }, [eventSlug, context]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden">
                <AmbientAurora />
                {/* Architecture: Do not track mouse on loading screen if on mobile */}
                {!isMobile && <InteractiveAura />}
            </div>
        );
    }

    const theme = eventData?.theme_config || {};
    const images = eventData?.images || [];
    const hasImages = images.length > 0;
    
    // ARCHITECTURE: Context-Aware Layer Detection
    // Determines if the user is in the deep Application Layer (Dashboard) vs the Marketing Layer
    // Strictly enforcing the rule: Heavy image backgrounds are ONLY for Hub, Register, and Portal entrance.
    const isAppLayer = pathname.includes('/dashboard');
    const showImageBackground = hasImages && !isAppLayer;
    
    let radiusVar = '32px'; 
    let buttonRadiusVar = '9999px'; 
    if (theme.radius === 'none') { radiusVar = '0px'; buttonRadiusVar = '0px'; } 
    else if (theme.radius === 'sm') { radiusVar = '8px'; buttonRadiusVar = '4px'; }

    let fontClass = 'font-sans';
    if (theme.fontFamily === 'serif') fontClass = 'font-serif';
    if (theme.fontFamily === 'mono') fontClass = 'font-mono';

    const cssVariables = {
        '--tenant-bg': theme.background || '#09090b',
        '--tenant-text': theme.text || '#ffffff',
        '--tenant-primary': theme.primary || '#8b5cf6',
        '--tenant-accent': theme.accent || '#3b82f6',
        '--tenant-radius': radiusVar,
        '--tenant-btn-radius': buttonRadiusVar
    };

    return (
        <div style={cssVariables} className={`min-h-screen bg-[var(--tenant-bg)] text-[var(--tenant-text)] selection:bg-[var(--tenant-primary)]/30 transition-colors duration-1000 ${fontClass} relative overflow-hidden`}>
            
            {/* Global Dynamic Background Engine */}
            <AnimatePresence mode="wait">
                {showImageBackground ? (
                    <motion.div key="bg-images" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 z-0">
                        <HeroSlideshow images={images} isMobile={isMobile} />
                    </motion.div>
                ) : (
                    <motion.div key="bg-aurora" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 z-0">
                        <AmbientAurora />
                        {/* Architecture: Texture is now cleanly bound to the App Layer background! */}
                        <SurfaceTexture type={theme.texture} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Architecture: Completely unmount the heavy cursor-tracking component on touch devices to free up the main thread */}
            {!isMobile && <InteractiveAura />}
            
            {/* Seamless Page Router */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative z-10 w-full h-full"
                >
                    {children}
                </motion.div>
            </AnimatePresence>

        </div>
    );
}
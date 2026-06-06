"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LumaDropdown = ({ 
    label, 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select an option...",
    // ARCHITECT NOTE: New directional anchor prop
    direction = "down" 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    // ARCHITECT NOTE: Dynamic positioning based on the anchor direction
    const menuPositionClass = direction === 'up' 
        ? 'bottom-[calc(100%+8px)] origin-bottom' 
        : 'top-[calc(100%+8px)] origin-top';
        
    const initialY = direction === 'up' ? 10 : -10;

    return (
        <div className="space-y-2 relative w-full">
            {label && (
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">
                    {label}
                </label>
            )}
            
            <div 
                onClick={() => setIsOpen(true)}
                className="w-full bg-white/[0.02] border border-white/[0.05] text-white rounded-full px-6 py-4 cursor-pointer hover:border-indigo-500/50 transition-all text-sm shadow-inner flex items-center justify-between group relative z-20"
            >
                <span className={selectedOption ? 'text-white' : 'text-zinc-600'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.svg 
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)}
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, y: initialY, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: initialY, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            // ARCHITECT NOTE: High z-index and dynamic positioning applied
                            className={`absolute left-0 w-full z-[100] bg-zinc-950/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] ${menuPositionClass}`}
                        >
                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                                {options.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-zinc-600 font-medium">
                                        No options available.
                                    </div>
                                ) : (
                                    options.map((option) => {
                                        const isSelected = option.value === value;
                                        return (
                                            <div 
                                                key={option.value}
                                                onClick={() => {
                                                    onChange(option.value);
                                                    setIsOpen(false);
                                                }}
                                                className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 mb-1 last:mb-0 ${
                                                    isSelected 
                                                    ? 'bg-white/[0.06] text-white font-medium' 
                                                    : 'hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                <span className="text-sm">{option.label}</span>
                                                {isSelected && (
                                                    <motion.svg 
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-4 h-4 text-indigo-400" 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </motion.svg>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const FontContext = createContext();

export const useFont = () => useContext(FontContext);

const validFonts = ['inter', 'lora', 'jetbrains-mono', 'google-sans-code'];

export const FontProvider = ({ children }) => {
    const [font, setFont] = useState(() => {
        // On initial client load, get the font from localStorage or default to 'inter'
        if (typeof window !== 'undefined') {
            const savedFont = localStorage.getItem('journal-font-theme');
            return validFonts.includes(savedFont) ? savedFont : 'inter';
        }
        return 'inter';
    });

    useEffect(() => {
        const root = document.documentElement;

        validFonts.forEach(f => root.classList.remove(`font-theme-${f}`));

        root.classList.add(`font-theme-${font}`);

        localStorage.setItem('journal-font-theme', font);
    }, [font]);

    const value = useMemo(() => ({ font, setFont }), [font]);

    return (
        <FontContext.Provider value={value}>
            {children}
        </FontContext.Provider>
    );
};
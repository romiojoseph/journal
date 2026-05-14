'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import styles from '../styles/Toast.module.css';
import { X, Info, CheckCircle, Warning, WarningCircle } from '@phosphor-icons/react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({ title, message, type = 'info', duration = 7000 }) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, title, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <Toast 
                        key={toast.id} 
                        {...toast} 
                        onClose={() => removeToast(toast.id)} 
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ title, message, type, duration, onClose }) {
    const [progress, setProgress] = useState(100);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    
    useEffect(() => {
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const percent = (remaining / duration) * 100;
            setProgress(percent);
            
            if (remaining <= 0) {
                clearInterval(interval);
                onCloseRef.current();
            }
        }, 10);

        return () => clearInterval(interval);
    }, [duration]);

    const icons = {
        info: <Info size={24} weight="duotone" className={styles.infoIcon} />,
        success: <CheckCircle size={24} weight="duotone" className={styles.successIcon} />,
        warning: <Warning size={24} weight="duotone" className={styles.warningIcon} />,
        error: <WarningCircle size={24} weight="duotone" className={styles.errorIcon} />
    };

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <div className={styles.iconArea}>
                {icons[type]}
            </div>
            <div className={styles.content}>
                {title && <div className={styles.title}>{title}</div>}
                <div className={styles.message}>{message}</div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
                <X size={16} />
            </button>
            <div className={styles.progressBarWrapper}>
                <div 
                    className={styles.progressBar} 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useModal } from '../context/ModalContext';
import styles from '../styles/Security.module.css';

export default function SecurityManager({ initialIsEnabled }) {
    const { showAlert } = useModal();
    const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
    const [pin1, setPin1] = useState('');
    const [pin2, setPin2] = useState('');

    const handleEnable = async () => {
        if (pin1.length !== 6) {
            return showAlert({ title: 'Error', message: 'PIN must be exactly 6 characters.' });
        }
        if (pin1 !== pin2) {
            return showAlert({ title: 'Error', message: 'PINs do not match.' });
        }

        const response = await fetch('/api/security-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin1 }),
        });

        if (response.ok) {
            setIsEnabled(true);
            setPin1('');
            setPin2('');
            // --- THIS IS THE FIX ---
            // We add an onOk callback to the success alert to trigger a reload.
            showAlert({
                title: 'Success',
                message: 'Security PIN has been enabled. The app will now reload.',
                onOk: () => window.location.reload()
            });
            // --- END FIX ---
        } else {
            showAlert({ title: 'Error', message: 'Failed to enable PIN.' });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleEnable();
    };

    const handleDisable = async () => {
        const response = await fetch('/api/security-pin', { method: 'DELETE' });
        if (response.ok) {
            setIsEnabled(false);
            // --- THIS IS THE FIX ---
            // We also add the onOk callback here.
            showAlert({
                title: 'Success',
                message: 'Security PIN has been disabled. The app will now reload.',
                onOk: () => window.location.reload()
            });
            // --- END FIX ---
        } else {
            showAlert({ title: 'Error', message: 'Failed to disable PIN.' });
        }
    };

    return (
        <div className={styles.manager}>
            <h2>Lock your vault</h2>
            <div className={styles.category}>
                <h4>{isEnabled ? 'PIN is currently enabled' : 'PIN is currently disabled'}</h4>

                {isEnabled ? (
                    <div>
                        <p>To change or remove your PIN, you must first disable it.</p>
                        <button onClick={handleDisable} className={styles.disableButton}>Disable PIN</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.addForm}>
                        <p>Use a 6-digit PIN to add an extra layer of security to your journal vault. You can mix numbers and letters. <strong>There is no &quot;Forgot PIN&quot; feature.</strong>. If you lose your PIN, you will not be able to access your journal through the app. The only recovery method would be to manually inspect the `journal.db`  file using any DB browser tool or delete it and start over. It&apos;s only used to block access to your data through the UI. Remember, your data and privacy are entirely in your hands.</p>
                        <input
                            type="password"
                            value={pin1}
                            onChange={(e) => setPin1(e.target.value)}
                            placeholder="Enter 6-digit PIN"
                            maxLength={6}
                        />
                        <input
                            type="password"
                            value={pin2}
                            onChange={(e) => setPin2(e.target.value)}
                            placeholder="Confirm PIN"
                            maxLength={6}
                        />
                        <button type="submit">Enable PIN</button>
                    </form>
                )}
            </div>
        </div>
    );
}
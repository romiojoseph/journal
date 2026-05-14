'use client';

import { useState } from 'react';
import { useModal } from '../context/ModalContext';
import styles from '../styles/Security.module.css';

export default function SecurityManager({ initialIsEnabled }) {
    const { showAlert } = useModal();
    const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
    const [passphrase1, setPassphrase1] = useState('');
    const [passphrase2, setPassphrase2] = useState('');
    const [disablePassphrase, setDisablePassphrase] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);

    const handleEnable = async () => {
        // ... (rest of handleEnable remains same)
        if (!passphrase1 || passphrase1.trim().length === 0) {
            return showAlert({ title: 'Error', message: 'Passphrase cannot be empty.' });
        }
        if (passphrase1 !== passphrase2) {
            return showAlert({ title: 'Error', message: 'Passphrases do not match.' });
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/security-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passphrase: passphrase1 }),
            });

            if (response.ok) {
                setIsEnabled(true);
                setPassphrase1('');
                setPassphrase2('');
                showAlert({
                    title: 'Success',
                    message: 'Encryption has been enabled and data migrated. The app will now reload to apply changes.',
                    onOk: () => { window.location.href = '/access-vault'; }
                });
            } else {
                showAlert({ title: 'Error', message: 'Failed to enable encryption.' });
                setIsProcessing(false);
            }
        } catch (err) {
            showAlert({ title: 'Error', message: 'Connection error.' });
            setIsProcessing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleEnable();
    };

    const handleDisable = async (e) => {
        if (e) e.preventDefault();

        if (!disablePassphrase) {
            return showAlert({ title: 'Error', message: 'Please enter your passphrase to disable encryption.' });
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/security-pin', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passphrase: disablePassphrase })
            });

            if (response.ok) {
                setIsEnabled(false);
                localStorage.removeItem('vault-unlocked-expiry');
                showAlert({
                    title: 'Success',
                    message: 'Encryption has been disabled and data decrypted. The app will now reload to apply changes.',
                    onOk: () => { window.location.href = '/config/security?t=' + Date.now(); }
                });
            } else {
                const data = await response.json();
                showAlert({ title: 'Error', message: data.error || 'Failed to disable encryption.' });
                setIsProcessing(false);
            }
        } catch (err) {
            showAlert({ title: 'Error', message: 'Connection error.' });
            setIsProcessing(false);
        }
    };

    return (
        <div className={styles.manager}>
            <h2>Lock your vault</h2>
            <div className={styles.category}>
                <h4>{isEnabled ? 'Encryption is currently enabled' : 'Encryption is currently disabled'}</h4>

                {isEnabled ? (
                    <div className={styles.disableSection}>
                        {isConfirmingDisable ? (
                            <form onSubmit={handleDisable} className={styles.addForm}>
                                <p>Enter your passphrase to confirm disabling encryption. This will decrypt all your data.</p>
                                <input
                                    type="password"
                                    value={disablePassphrase}
                                    onChange={(e) => setDisablePassphrase(e.target.value)}
                                    placeholder="Enter passphrase to disable"
                                    disabled={isProcessing}
                                    autoFocus
                                />
                                <div className={styles.actionButtons}>
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingDisable(false)}
                                        className={styles.cancelButton}
                                        disabled={isProcessing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.disableButton}
                                        disabled={isProcessing || !disablePassphrase}
                                    >
                                        {isProcessing ? 'Disabling...' : 'Confirm & Disable'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '24px' }}>To change or remove your passphrase, you must first disable encryption. Disabling encryption will decrypt all existing data.</p>
                                <button
                                    onClick={() => setIsConfirmingDisable(true)}
                                    className={styles.disableButton}
                                >
                                    Disable Encryption
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.addForm}>
                        <p>Use a passphrase to encrypt your entries. <strong>There is no &quot;Forgot Passphrase&quot; option.</strong> If you lose it, all encrypted data is permanently unreadable with no way to recover it. Store your passphrase in a password manager like Bitwarden. Your data and privacy are entirely in your hands. If you are confident no one else has access to your device, you can skip encryption entirely.</p>
                        <input
                            type="password"
                            value={passphrase1}
                            onChange={(e) => setPassphrase1(e.target.value)}
                            placeholder="Enter passphrase"
                            disabled={isProcessing}
                        />
                        <input
                            type="password"
                            value={passphrase2}
                            onChange={(e) => setPassphrase2(e.target.value)}
                            placeholder="Confirm passphrase"
                            disabled={isProcessing}
                        />
                        <button type="submit" disabled={isProcessing || !passphrase1}>
                            {isProcessing ? 'Enabling...' : 'Enable Encryption'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
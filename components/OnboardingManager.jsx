'use client';

import { useEffect } from 'react';
import { useModal } from '../context/ModalContext';
import { CheckCircle } from '@phosphor-icons/react';
import styles from '../styles/Onboarding.module.css';

const OnboardingContent = () => (
    <div>
        <p className={styles.subtext}>
            Before begin, a few things...
        </p>
        <ul className={styles.featureList}>
            <li><CheckCircle size={24} weight="duotone" />Write whenever it feels right.</li>
            <li><CheckCircle size={24} weight="duotone" />No need to write every day or feel pressured to track emotions daily. There are no streaks or deadlines. It&apos;s all up to you.</li>
            <li><CheckCircle size={24} weight="duotone" />You have full ownership of your data. It&apos;s stored locally in a .db format, and you can take it with you anytime you wish. No strings attached, no clauses. Just your data, always yours.</li>
            <li><CheckCircle size={24} weight="duotone" />To prevent data corruption and data loss, please back up your database occasionally and save it in a secure location, cloud or local - your choice. Your data, your responsibility.</li>
            <li><CheckCircle size={24} weight="duotone" />No account or email needed. Nothing gets sent or received, not even anonymous tracking.</li>
            <li><CheckCircle size={24} weight="duotone" />Disclaimer: Please note that this is a vibe coded app. The source code is available publicly, so you or anyone you know can check it out and only use if you&apos;re comfortable with it.</li>
        </ul>
    </div>
);

export default function OnboardingManager({ isFirstLaunch, children }) {
    // Get both showModal and hideModal from the context
    const { showModal, hideModal } = useModal();

    useEffect(() => {
        const hasOnboarded = localStorage.getItem('hasOnboarded');

        if (isFirstLaunch && !hasOnboarded) {
            showModal({
                title: 'Hey there!',
                content: <OnboardingContent />,
                isDismissable: false,
                actions: [
                    {
                        label: 'Proceed',
                        onClick: () => {
                            localStorage.setItem('hasOnboarded', 'true');
                            hideModal();
                        },
                        variant: 'primary'
                    }
                ]
            });
        }
        // Add hideModal to the dependency array to satisfy the linter
    }, [isFirstLaunch, showModal, hideModal]);

    return <>{children}</>;
}
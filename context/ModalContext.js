'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import Modal from '../components/Modal';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        content: null,
        actions: [],
        isDismissable: true,
    });

    const hideModal = useCallback(() => {
        setModalConfig({ isOpen: false, title: '', content: null, actions: [], isDismissable: true });
    }, []);

    const showModal = useCallback(({ title, content, actions, isDismissable = true }) => {
        setModalConfig({
            isOpen: true,
            title,
            content: typeof content === 'string' ? <p>{content}</p> : content,
            actions,
            isDismissable,
        });
    }, []);

    const showAlert = useCallback(({ title, message, onOk }) => {
        showModal({
            title,
            content: message,
            actions: [
                {
                    label: 'OK', onClick: () => {
                        if (onOk) onOk();
                        hideModal();
                    }, variant: 'primary'
                }
            ]
        });
    }, [showModal, hideModal]);

    const showConfirm = useCallback(({ title, message, onConfirm, confirmLabel = 'Confirm' }) => {
        showModal({
            title,
            content: message,
            actions: [
                { label: 'Cancel', onClick: hideModal, variant: 'default' },
                {
                    label: confirmLabel, onClick: () => {
                        onConfirm();
                        hideModal();
                    }, variant: 'danger'
                }
            ]
        });
    }, [showModal, hideModal]);

    const value = useMemo(() => ({ showModal, showAlert, showConfirm, hideModal }), [showModal, showAlert, showConfirm, hideModal]);

    return (
        <ModalContext.Provider value={value}>
            {children}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={hideModal}
                title={modalConfig.title}
                actions={modalConfig.actions}
                isDismissable={modalConfig.isDismissable}
            >
                {modalConfig.content}
            </Modal>
        </ModalContext.Provider>
    );
};
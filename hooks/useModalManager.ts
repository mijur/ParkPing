import { useState, useCallback } from 'react';
import type { ParkingSpace } from '../types';

export interface ConfirmationAction {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonText?: string;
  confirmButtonVariant?: 'primary' | 'destructive';
}

/**
 * Custom hook for managing modal states and operations
 */
export const useModalManager = () => {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [markAvailableModalOpen, setMarkAvailableModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null);

  const openAssignModal = useCallback((spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setAssignModalOpen(true);
  }, []);

  const closeAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setSelectedSpot(null);
  }, []);

  const openMarkAvailableModal = useCallback((spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setMarkAvailableModalOpen(true);
  }, []);

  const closeMarkAvailableModal = useCallback(() => {
    setMarkAvailableModalOpen(false);
    setSelectedSpot(null);
  }, []);

  const showConfirmation = useCallback((action: ConfirmationAction) => {
    setConfirmationAction(action);
    setConfirmationModalOpen(true);
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmationModalOpen(false);
  }, []);

  return {
    // Assign modal
    assignModalOpen,
    openAssignModal,
    closeAssignModal,

    // Mark available modal
    markAvailableModalOpen,
    openMarkAvailableModal,
    closeMarkAvailableModal,

    // Confirmation modal
    confirmationModalOpen,
    confirmationAction,
    showConfirmation,
    closeConfirmation,

    // Selected spot
    selectedSpot,
    setSelectedSpot,
  };
};

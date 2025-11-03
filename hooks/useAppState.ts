import { useState, useCallback, useEffect, useMemo } from 'react';
import type { User, ParkingSpace, Availability } from '../types';
import { AvailabilityManager } from '../services/availabilityManager';
import { SpotManager } from '../services/spotManager';
import * as dbService from '../services/database';

/**
 * Custom hook for managing core app state
 */
export const useAppState = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'default' | 'all'>('default');
  const [weekOffset, setWeekOffset] = useState(0);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersData, spacesData, availabilitiesData] = await Promise.all([
          dbService.fetchUsers().catch(err => {
            console.warn('Failed to load users:', err);
            return [];
          }),
          dbService.fetchParkingSpaces().catch(err => {
            console.warn('Failed to load parking spaces:', err);
            return [];
          }),
          dbService.fetchAvailabilities().catch(err => {
            console.warn('Failed to load availabilities:', err);
            return [];
          }),
        ]);
        setUsers(usersData);
        setParkingSpaces(spacesData);
        setAvailabilities(AvailabilityManager.sortAvailabilities(availabilitiesData));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Computed values
  const ownedSpot = useMemo(
    () => (currentUser ? SpotManager.getOwnedSpot(currentUser.id, parkingSpaces) : undefined),
    [parkingSpaces, currentUser]
  );

  const claimedAvailability = useMemo(
    () => (currentUser ? AvailabilityManager.getClaimedAvailability(currentUser.id, availabilities) : undefined),
    [availabilities, currentUser]
  );

  const userHasClaimedSpot = useMemo(
    () => !!claimedAvailability,
    [claimedAvailability]
  );

  const canClaimSpot = useMemo(
    () => !ownedSpot && !userHasClaimedSpot,
    [ownedSpot, userHasClaimedSpot]
  );

  const usersWithoutSpots = useMemo(
    () => SpotManager.getUsersWithoutSpots(users, parkingSpaces),
    [users, parkingSpaces]
  );

  const isAdmin = currentUser?.role?.toString() === '0'; // Assuming Role.Admin is '0'

  // Callbacks for state updates
  const updateParkingSpaces = useCallback((updater: (prev: ParkingSpace[]) => ParkingSpace[]) => {
    setParkingSpaces(updater);
  }, []);

  const updateAvailabilities = useCallback((updater: (prev: Availability[]) => Availability[]) => {
    setAvailabilities(prev => AvailabilityManager.sortAvailabilities(updater(prev)));
  }, []);

  const addParkingSpace = useCallback((space: ParkingSpace) => {
    setParkingSpaces(prev => [...prev, space]);
  }, []);

  const removeParkingSpace = useCallback((spotId: number) => {
    setParkingSpaces(prev => prev.filter(space => space.id !== spotId));
    setAvailabilities(prev => prev.filter(entry => entry.spotId !== spotId));
  }, []);

  const addAvailability = useCallback((availability: Availability) => {
    setAvailabilities(prev => AvailabilityManager.sortAvailabilities([...prev, availability]));
  }, []);

  const removeAvailability = useCallback((availabilityId: string) => {
    setAvailabilities(prev => prev.filter(entry => entry.id !== availabilityId));
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => (prev === 'default' ? 'all' : 'default'));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset(prev => Math.min(prev + 1, 1));
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setWeekOffset(prev => Math.max(prev - 1, 0));
  }, []);

  return {
    // State
    users,
    setUsers,
    parkingSpaces,
    setParkingSpaces,
    availabilities,
    setAvailabilities,
    currentUser,
    setCurrentUser,
    loading,
    viewMode,
    setViewMode,
    weekOffset,
    setWeekOffset,

    // Computed
    ownedSpot,
    claimedAvailability,
    userHasClaimedSpot,
    canClaimSpot,
    usersWithoutSpots,
    isAdmin,

    // Updaters
    updateParkingSpaces,
    updateAvailabilities,
    addParkingSpace,
    removeParkingSpace,
    addAvailability,
    removeAvailability,
    toggleViewMode,
    goToNextWeek,
    goToPreviousWeek,
  };
};

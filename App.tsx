import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { User, ParkingSpace, Availability } from './types';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import AddSpotCard from './components/AddSpotCard';
import AssignOwnerModal from './components/modals/AssignOwnerModal';
import MarkAvailableModal from './components/modals/MarkAvailableModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import OwnerView from './components/OwnerView';
import LoginView from './components/LoginView';
import { getToday } from './utils/dateUtils';
import { Role } from './types';
import * as authService from './services/auth';
import * as dbService from './services/database';

const generateId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;

const normalizeDate = (value: Date): Date => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (value: Date, amount: number): Date => {
  const updated = new Date(value);
  updated.setDate(updated.getDate() + amount);
  updated.setHours(0, 0, 0, 0);
  return updated;
};

const sortAvailabilities = (entries: Availability[]): Availability[] =>
  [...entries].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime();
    if (startDiff !== 0) return startDiff;
    if (a.spotId !== b.spotId) return a.spotId - b.spotId;
    const endDiff = a.endDate.getTime() - b.endDate.getTime();
    if (endDiff !== 0) return endDiff;
    return a.id.localeCompare(b.id);
  });

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [markAvailableModalOpen, setMarkAvailableModalOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonVariant?: 'primary' | 'destructive';
  } | null>(null);
  
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
        setAvailabilities(sortAvailabilities(availabilitiesData));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize auth state and set up subscriptions on auth change
  useEffect(() => {
    let spacesSubscription: ReturnType<typeof dbService.subscribeToParkingSpaces> | null = null;
    let availabilitiesSubscription: ReturnType<typeof dbService.subscribeToAvailabilities> | null = null;

    const setupSubscriptions = (user: User | null) => {
      // Clean up existing subscriptions
      spacesSubscription?.unsubscribe();
      availabilitiesSubscription?.unsubscribe();

      // Set up new subscriptions if user is authenticated
      if (user) {
        spacesSubscription = dbService.subscribeToParkingSpaces((spaces) => {
          setParkingSpaces(spaces);
        });

        availabilitiesSubscription = dbService.subscribeToAvailabilities((avails) => {
          setAvailabilities(sortAvailabilities(avails));
        });
      }
    };

    const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      setupSubscriptions(user);
    };

    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setupSubscriptions(user);
    });

    return () => {
      subscription.unsubscribe();
      spacesSubscription?.unsubscribe();
      availabilitiesSubscription?.unsubscribe();
    };
  }, []);

  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn({ email, password });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      // Refresh users list
      const usersData = await dbService.fetchUsers();
      setUsers(usersData);
    }
    return { success: result.success, message: result.message };
  }, []);

  const handleEmailSignUp = useCallback(async (email: string, password: string, name: string) => {
    const result = await authService.signUp({ email, password, name });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      // Refresh users list
      const usersData = await dbService.fetchUsers();
      setUsers(usersData);
    }
    return { success: result.success, message: result.message };
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === Role.Admin;
  const usersWithoutSpots = useMemo(
    () => users.filter(u => !parkingSpaces.some(p => p.ownerId === u.id) && u.role === Role.User),
    [users, parkingSpaces]
  );
  
  const ownedSpot = useMemo(
    () => currentUser ? parkingSpaces.find(p => p.ownerId === currentUser.id) : undefined,
    [parkingSpaces, currentUser]
  );

  const claimedAvailability = useMemo(
    () => currentUser ? availabilities.find(a => a.claimedById === currentUser.id) : undefined,
    [availabilities, currentUser]
  );
  const userHasClaimedSpot = !!claimedAvailability;
  
  const canClaimSpot = !ownedSpot && !userHasClaimedSpot;

  const displayedSpaces = useMemo(() => {
    const today = getToday();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    if (isAdmin) {
      // If admin doesn't have a spot assigned and wants to claim, show available spots
      if (viewMode === 'default' && !ownedSpot && canClaimSpot) {
        const availableThisWeek = parkingSpaces.filter(space =>
          availabilities.some(a =>
            a.spotId === space.id &&
            !a.claimedById &&
            a.startDate.getTime() <= endOfWeek.getTime() &&
            a.endDate.getTime() >= startOfWeek.getTime()
          )
        );
        
        if (claimedAvailability) {
          const claimedSpot = parkingSpaces.find(space => space.id === claimedAvailability.spotId);
          
          let combinedList = [...availableThisWeek];
          if (claimedSpot && !combinedList.some(s => s.id === claimedSpot.id)) {
              combinedList.push(claimedSpot);
          }

          combinedList.sort((a, b) => {
              if (a.id === claimedAvailability.spotId) return -1;
              if (b.id === claimedAvailability.spotId) return 1;
              return a.id - b.id;
          });
          
          return combinedList;
        }
        return availableThisWeek;
      }
      // Otherwise show all spots with owners (default) or all spots (all mode)
      return viewMode === 'default' ? parkingSpaces.filter(p => p.ownerId) : parkingSpaces;
    }

    if (viewMode === 'default' && !ownedSpot) {
      const availableThisWeek = parkingSpaces.filter(space =>
        availabilities.some(a =>
          a.spotId === space.id &&
          !a.claimedById &&
          a.startDate.getTime() <= endOfWeek.getTime() &&
          a.endDate.getTime() >= startOfWeek.getTime()
        )
      );
      
      if (claimedAvailability) {
        const claimedSpot = parkingSpaces.find(space => space.id === claimedAvailability.spotId);
        
        let combinedList = [...availableThisWeek];
        if (claimedSpot && !combinedList.some(s => s.id === claimedSpot.id)) {
            combinedList.push(claimedSpot);
        }

        combinedList.sort((a, b) => {
            if (a.id === claimedAvailability.spotId) return -1;
            if (b.id === claimedAvailability.spotId) return 1;
            return a.id - b.id;
        });
        
        return combinedList;
      }
      return availableThisWeek;
    }
    
    return parkingSpaces;
  }, [viewMode, isAdmin, parkingSpaces, availabilities, ownedSpot, claimedAvailability, weekOffset, canClaimSpot]);

  const handleNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 1));
  const handlePreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, 0));

  const handleAddSpot = async () => {
    if (!isAdmin) {
      console.error('Only admins can add parking spots');
      return;
    }
    try {
      const newSpace = await dbService.createParkingSpace();
      setParkingSpaces(prev => [...prev, newSpace]);
    } catch (error: any) {
      console.error('Error adding spot:', error);
      // Show user-friendly error if available
      if (error?.message) {
        alert(`Failed to add parking spot: ${error.message}`);
      }
    }
  };

  const handleOpenAssignModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setAssignModalOpen(true);
  };
  
  const handleAssignOwner = async (spotId: number, ownerId: string) => {
    try {
      await dbService.updateParkingSpace(spotId, { ownerId });
      setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId } : space)));
      setAssignModalOpen(false);
      setSelectedSpot(null);
    } catch (error) {
      console.error('Error assigning owner:', error);
    }
  };
  
  const handleRequestUnassign = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    const owner = users.find(u => u.id === spot?.ownerId);
    if (!spot || !owner) return;

    setConfirmationAction({
      title: 'Confirm Unassign',
      message: `Are you sure you want to unassign ${owner.name} from Spot #${spot.id}?`,
      onConfirm: async () => {
        try {
          await dbService.updateParkingSpace(spotId, { ownerId: null });
          setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId: null } : space)));
          setConfirmationModalOpen(false);
        } catch (error) {
          console.error('Error unassigning owner:', error);
        }
      },
      confirmButtonText: 'Unassign',
      confirmButtonVariant: 'destructive'
    });
    setConfirmationModalOpen(true);
  };

  const handleOpenMarkAvailableModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setMarkAvailableModalOpen(true);
  };
  
  const handleRequestMarkAvailable = async (spotId: number, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string }> => {
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);

    const overlapping = availabilities.find(avail =>
      avail.spotId === spotId &&
      normalizedStart.getTime() <= avail.endDate.getTime() &&
      normalizedEnd.getTime() >= avail.startDate.getTime()
    );

    if (overlapping) {
      if (overlapping.claimedById) {
        return { success: false, message: 'This period overlaps with a claimed availability and cannot be changed.' };
      }

      setConfirmationAction({
        title: 'Overwrite Availability',
        message: 'Your new availability overlaps with an existing one. Do you want to replace it?',
        onConfirm: async () => {
          try {
            await dbService.deleteAvailability(overlapping.id);
            const newAvailability = await dbService.createAvailability(spotId, normalizedStart, normalizedEnd);
            setAvailabilities(prev => {
              const filtered = prev.filter(entry => entry.id !== overlapping.id);
              return sortAvailabilities([...filtered, newAvailability]);
            });
            setConfirmationModalOpen(false);
          } catch (error) {
            console.error('Error overwriting availability:', error);
          }
        },
        confirmButtonText: 'Overwrite',
      });
      setConfirmationModalOpen(true);
      return { success: true, message: '' };
    }

    try {
      const newAvailability = await dbService.createAvailability(spotId, normalizedStart, normalizedEnd);
      setAvailabilities(prev => sortAvailabilities([...prev, newAvailability]));
      return { success: true, message: '' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to create availability' };
    }
  };

  const handleClaimDay = async (availabilityId: string, dayToClaim: Date) => {
    if (!canClaimSpot || !currentUser) return;
    const normalizedDay = normalizeDate(dayToClaim);

    const target = availabilities.find(entry => entry.id === availabilityId);
    if (!target || target.claimedById) {
      return;
    }

    const start = normalizeDate(target.startDate);
    const end = normalizeDate(target.endDate);
    if (normalizedDay.getTime() < start.getTime() || normalizedDay.getTime() > end.getTime()) {
      return;
    }

    try {
      // Delete the original availability
      await dbService.deleteAvailability(availabilityId);

      // Create the claimed day
      const claimedAvailability = await dbService.createAvailability(
        target.spotId,
        normalizedDay,
        normalizedDay
      );
      await dbService.updateAvailability(claimedAvailability.id, { claimedById: currentUser.id });

      // Create remaining availability before the claimed day
      if (normalizedDay.getTime() > start.getTime()) {
        await dbService.createAvailability(
          target.spotId,
          start,
          addDays(normalizedDay, -1)
        );
      }

      // Create remaining availability after the claimed day
      if (normalizedDay.getTime() < end.getTime()) {
        await dbService.createAvailability(
          target.spotId,
          addDays(normalizedDay, 1),
          end
        );
      }

      // Refresh availabilities
      const updatedAvailabilities = await dbService.fetchAvailabilities();
      setAvailabilities(sortAvailabilities(updatedAvailabilities));
    } catch (error) {
      console.error('Error claiming day:', error);
    }
  };
  
  const handleRequestUnclaim = (availabilityId: string) => {
      const availability = availabilities.find(a => a.id === availabilityId);
      if (!availability) return;

      setConfirmationAction({
          title: 'Confirm Unclaim',
          message: `Are you sure you want to unclaim your spot for ${availability.startDate.toLocaleDateString()}?`,
          onConfirm: async () => {
            try {
              await dbService.updateAvailability(availabilityId, { claimedById: null });
              setAvailabilities(prev => prev.map(entry => entry.id === availabilityId ? { ...entry, claimedById: null } : entry));
              setConfirmationModalOpen(false);
            } catch (error) {
              console.error('Error unclaiming:', error);
            }
          },
          confirmButtonText: 'Yes, Unclaim',
          confirmButtonVariant: 'destructive'
      });
      setConfirmationModalOpen(true);
  }
  
  const handleRequestUndoAvailability = (availabilityId: string) => {
    const availability = availabilities.find(a => a.id === availabilityId);
    if (!availability) return;

    setConfirmationAction({
        title: 'Confirm Undo Availability',
        message: `Are you sure you want to remove this availability?`,
        onConfirm: async () => {
          try {
            await dbService.deleteAvailability(availabilityId);
            setAvailabilities(prev => prev.filter(entry => entry.id !== availabilityId));
            setConfirmationModalOpen(false);
          } catch (error) {
            console.error('Error deleting availability:', error);
          }
        },
        confirmButtonText: 'Yes, Undo',
        confirmButtonVariant: 'destructive'
    });
    setConfirmationModalOpen(true);
  }

  const handleRequestDelete = (spotId: number) => {
    setConfirmationAction({
      title: 'Confirm Deletion',
      message: `Are you sure you want to permanently delete Spot #${spotId}?`,
      onConfirm: async () => {
        try {
          await dbService.deleteParkingSpace(spotId);
          setParkingSpaces(prev => prev.filter(space => space.id !== spotId));
          setAvailabilities(prev => prev.filter(entry => entry.spotId !== spotId));
          setConfirmationModalOpen(false);
        } catch (error) {
          console.error('Error deleting spot:', error);
        }
      },
      confirmButtonText: 'Delete Spot',
      confirmButtonVariant: 'destructive'
    });
    setConfirmationModalOpen(true);
  };
  
  const bannerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.2)'
  };
  const viewControlsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' };
  const viewTitleStyle: React.CSSProperties = { margin: 0, fontWeight: 700, fontSize: '24px' };
  const toggleButtonStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", fontWeight: 500 };
  const weekButtonStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", fontWeight: 700, fontSize: '16px' };
  const disabledButtonStyle: React.CSSProperties = { opacity: 0.5, cursor: 'not-allowed', borderColor: 'rgba(255, 255, 255, 0.5)', color: 'rgba(255, 255, 255, 0.5)' };
  
  const getViewConfig = () => {
    if (isAdmin) {
      // If admin doesn't have a spot assigned and can claim, show available spots view
      if (viewMode === 'default' && !ownedSpot && canClaimSpot) {
        const weekTitle = weekOffset === 0 ? 'This Week' : 'Next Week';
        return { title: `Available ${weekTitle}`, buttonText: 'Show All Spots' };
      }
      return viewMode === 'default' ? { title: 'Owned Spots', buttonText: 'Show All Spots' } : { title: 'All Spots', buttonText: 'Show Owned Only' };
    }
    if (viewMode === 'default') {
      const weekTitle = weekOffset === 0 ? 'This Week' : 'Next Week';
      return { title: `Available ${weekTitle}`, buttonText: 'Show All Spots' };
    }
    const buttonText = claimedAvailability ? 'Show Available Spots' : 'Show Available This Week';
    return { title: 'All Spots', buttonText };
  };

  const { title, buttonText } = getViewConfig();
  const getEmptyStateMessage = () => {
    if (isAdmin) {
      // If admin doesn't have a spot assigned and can claim, show user message
      if (viewMode === 'default' && !ownedSpot && canClaimSpot) {
        const weekText = weekOffset === 0 ? 'this week' : 'next week';
        return `No parking spots are available ${weekText}. Please check back later.`;
      }
      return viewMode === 'default' ? 'No spots are currently assigned to users.' : 'There are no spots in the system. Add one!';
    }
    const weekText = weekOffset === 0 ? 'this week' : 'next week';
    return viewMode === 'default' ? `No parking spots are available ${weekText}. Please check back later.` : 'There are no spots in the system.';
  }

  if (loading) {
    return <div style={{ fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", padding: '40px', backgroundColor: '#5A48E5', minHeight: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", padding: '40px', backgroundColor: '#5A48E5', minHeight: '100vh', color: 'white' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 700, margin: 0 }}>SpyroPark</h1>
        {currentUser && (
          <div style={{textAlign: 'right'}}>
            <p style={{margin: '0 0 8px 0'}}>Welcome, {currentUser.name}</p>
            <button onClick={handleLogout} style={{...toggleButtonStyle, borderColor: '#FFB8B8', color: '#FFB8B8'}}>Logout</button>
          </div>
        )}
      </header>

      {!currentUser ? (
        <LoginView onLogin={handleEmailLogin} onSignUp={handleEmailSignUp} />
      ) : ownedSpot && !isAdmin ? (
        <OwnerView
          spot={ownedSpot}
          users={users}
          availabilities={availabilities.filter(a => a.spotId === ownedSpot.id)}
          onRequestMarkAvailable={(startDate, endDate) => handleRequestMarkAvailable(ownedSpot.id, startDate, endDate)}
          onUndoAvailability={handleRequestUndoAvailability}
        />
      ) : (
        <>
          {userHasClaimedSpot && !isAdmin && (
             <div style={bannerStyle}>You have already claimed a spot. You can only claim one spot at a time.</div>
          )}
          <main>
            <div style={viewControlsStyle}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={viewTitleStyle}>{title}</h2>
                 {viewMode === 'default' && !ownedSpot && canClaimSpot && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button style={{ ...weekButtonStyle, ...(weekOffset === 0 && disabledButtonStyle) }} disabled={weekOffset === 0} onClick={handlePreviousWeek}>&lt; Prev</button>
                    <button style={{ ...weekButtonStyle, ...(weekOffset === 1 && disabledButtonStyle) }} disabled={weekOffset === 1} onClick={handleNextWeek}>Next &gt;</button>
                  </div>
                )}
              </div>
              <button style={toggleButtonStyle} onClick={() => setViewMode(prev => prev === 'default' ? 'all' : 'default')}>{buttonText}</button>
            </div>
            
            {displayedSpaces.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {displayedSpaces.map(space => (
                  <ParkingSpaceCard
                    key={space.id}
                    space={space}
                    owner={users.find(u => u.id === space.ownerId)}
                    availabilities={availabilities.filter(a => a.spotId === space.id)}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    canClaimSpot={canClaimSpot}
                    weekOffset={weekOffset}
                    onAssign={handleOpenAssignModal}
                    onUnassign={handleRequestUnassign}
                    onMarkAvailable={handleOpenMarkAvailableModal}
                    onClaimDay={handleClaimDay}
                    onUnclaim={handleRequestUnclaim}
                    onDelete={handleRequestDelete}
                  />
                ))}
                {isAdmin && viewMode === 'all' && <AddSpotCard onAddSpot={handleAddSpot} />}
              </div>
            ) : (
              <div style={bannerStyle}>
                <p>{getEmptyStateMessage()}</p>
                {isAdmin && viewMode === 'all' && <AddSpotCard onAddSpot={handleAddSpot} />}
              </div>
            )}
          </main>
        </>
      )}
      
      {assignModalOpen && selectedSpot && (
        <AssignOwnerModal
          spot={selectedSpot}
          users={usersWithoutSpots}
          onAssign={handleAssignOwner}
          onClose={() => setAssignModalOpen(false)}
        />
      )}
      {markAvailableModalOpen && selectedSpot && (
        <MarkAvailableModal
          spot={selectedSpot}
          onRequestMarkAvailable={async (spotId, startDate, endDate) => {
              const result = await handleRequestMarkAvailable(spotId, startDate, endDate);
              if (result.success) {
                setMarkAvailableModalOpen(false);
                setSelectedSpot(null);
              }
              return result;
            }}
          onClose={() => setMarkAvailableModalOpen(false)}
        />
      )}
      {confirmationModalOpen && confirmationAction && (
        <ConfirmationModal
          title={confirmationAction.title}
          message={confirmationAction.message}
          onConfirm={confirmationAction.onConfirm}
          onClose={() => setConfirmationModalOpen(false)}
          confirmButtonText={confirmationAction.confirmButtonText}
          confirmButtonVariant={confirmationAction.confirmButtonVariant}
        />
      )}
    </div>
  );
};

export default App;
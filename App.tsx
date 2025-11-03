import React, { useEffect, useCallback } from 'react';
import type { User, ParkingSpace, Availability } from './types';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import AddSpotCard from './components/AddSpotCard';
import AssignOwnerModal from './components/modals/AssignOwnerModal';
import MarkAvailableModal from './components/modals/MarkAvailableModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import OwnerView from './components/OwnerView';
import LoginView from './components/LoginView';
import { Role } from './types';
import * as authService from './services/auth';
import * as dbService from './services/database';
import { AvailabilityManager } from './services/availabilityManager';
import { SpotManager } from './services/spotManager';
import { ViewManager } from './services/viewManager';
import { OperationHandler } from './services/operationHandler';
import { useAppState } from './hooks/useAppState';
import { useModalManager } from './hooks/useModalManager';

const App: React.FC = () => {
  // Use custom hooks to manage state and modals
  const appState = useAppState();
  const modals = useModalManager();

  const {
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
    ownedSpot,
    claimedAvailability,
    userHasClaimedSpot,
    canClaimSpot,
    usersWithoutSpots,
    isAdmin,
  } = appState;

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
          setAvailabilities(AvailabilityManager.sortAvailabilities(avails));
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
  }, [setCurrentUser, setParkingSpaces, setAvailabilities]);

  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn({ email, password });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      // Refresh users list
      const usersData = await dbService.fetchUsers();
      setUsers(usersData);
    }
    return { success: result.success, message: result.message };
  }, [setCurrentUser, setUsers]);

  const handleEmailSignUp = useCallback(async (email: string, password: string, name: string) => {
    const result = await authService.signUp({ email, password, name });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      // Refresh users list
      const usersData = await dbService.fetchUsers();
      setUsers(usersData);
    }
    return { success: result.success, message: result.message };
  }, [setCurrentUser, setUsers]);

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  // Get displayed spaces using ViewManager
  const displayedSpaces = ViewManager.getDisplayedSpaces(
    viewMode,
    isAdmin,
    parkingSpaces,
    availabilities,
    !!ownedSpot,
    claimedAvailability,
    canClaimSpot,
    weekOffset
  );

  const handleNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 1));
  const handlePreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, 0));

  const handleAddSpot = async () => {
    const result = await OperationHandler.handleAddSpot(isAdmin);
    if (result.success) {
      const newSpace = await dbService.createParkingSpace();
      setParkingSpaces(prev => [...prev, newSpace]);
    } else if (result.message) {
      alert(result.message);
    }
  };

  const handleAssignOwner = async (spotId: number, ownerId: string) => {
    const result = await OperationHandler.handleAssignOwner(spotId, ownerId);
    if (result.success) {
      setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId } : space)));
      modals.closeAssignModal();
    } else if (result.message) {
      console.error(result.message);
    }
  };

  const handleRequestUnassign = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    const owner = users.find(u => u.id === spot?.ownerId);
    if (!spot || !owner) return;

    const details = OperationHandler.getConfirmationDetails('unassign', spot, owner);
    if (!details) return;

    modals.showConfirmation({
      title: details.title,
      message: details.message,
      confirmButtonText: details.confirmButtonText,
      confirmButtonVariant: details.variant,
      onConfirm: async () => {
        const result = await OperationHandler.handleUnassignOwner(spotId);
        if (result.success) {
          setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId: null } : space)));
        }
        modals.closeConfirmation();
      },
    });
  };

  const handleOpenMarkAvailableModal = (spot: ParkingSpace) => {
    modals.openMarkAvailableModal(spot);
  };

  const handleRequestMarkAvailable = async (spotId: number, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string }> => {
    const result = await OperationHandler.handleMarkAvailable(spotId, startDate, endDate, availabilities);

    if (result.message === 'NEEDS_CONFIRMATION') {
      // Get the overlapping availability for confirmation
      const overlapping = AvailabilityManager.findOverlappingAvailability(spotId, startDate, endDate, availabilities);
      if (!overlapping) return { success: false, message: 'Overlapping availability not found' };

      const details = OperationHandler.getConfirmationDetails('overwrite');
      if (!details) return { success: false, message: 'Could not prepare confirmation' };

      modals.showConfirmation({
        title: details.title,
        message: details.message,
        confirmButtonText: details.confirmButtonText,
        confirmButtonVariant: details.variant,
        onConfirm: async () => {
          const overwriteResult = await OperationHandler.handleOverwriteAvailability(
            spotId,
            startDate,
            endDate,
            overlapping.id
          );
          if (overwriteResult.success) {
            await AvailabilityManager.deleteAvailability(overlapping.id);
            const newAvail = await AvailabilityManager.createAvailability(spotId, startDate, endDate);
            setAvailabilities(prev => {
              const filtered = prev.filter(entry => entry.id !== overlapping.id);
              return AvailabilityManager.sortAvailabilities([...filtered, newAvail]);
            });
          }
          modals.closeConfirmation();
        },
      });
      return { success: true, message: '' };
    }

    if (result.success) {
      const newAvail = await AvailabilityManager.createAvailability(spotId, startDate, endDate);
      setAvailabilities(prev => AvailabilityManager.sortAvailabilities([...prev, newAvail]));
    }

    return result;
  };

  const handleClaimDay = async (availabilityId: string, dayToClaim: Date) => {
    if (!canClaimSpot || !currentUser) return;

    const result = await OperationHandler.handleClaimDay(
      availabilityId,
      dayToClaim,
      currentUser,
      availabilities
    );

    if (result.success) {
      // Refresh availabilities
      const updatedAvailabilities = await dbService.fetchAvailabilities();
      setAvailabilities(AvailabilityManager.sortAvailabilities(updatedAvailabilities));
    } else {
      console.error(result.message);
    }
  };

  const handleRequestUnclaim = (availabilityId: string) => {
    const availability = availabilities.find(a => a.id === availabilityId);
    if (!availability) return;

    const details = OperationHandler.getConfirmationDetails('unclaim', undefined, undefined, availability);
    if (!details) return;

    modals.showConfirmation({
      title: details.title,
      message: details.message,
      confirmButtonText: details.confirmButtonText,
      confirmButtonVariant: details.variant,
      onConfirm: async () => {
        const result = await OperationHandler.handleUnclaim(availabilityId);
        if (result.success) {
          setAvailabilities(prev =>
            prev.map(entry => entry.id === availabilityId ? { ...entry, claimedById: null } : entry)
          );
        }
        modals.closeConfirmation();
      },
    });
  };

  const handleRequestUndoAvailability = (availabilityId: string) => {
    modals.showConfirmation({
      title: 'Confirm Undo Availability',
      message: 'Are you sure you want to remove this availability?',
      confirmButtonText: 'Yes, Undo',
      confirmButtonVariant: 'destructive',
      onConfirm: async () => {
        const result = await OperationHandler.handleDeleteAvailability(availabilityId);
        if (result.success) {
          setAvailabilities(prev => prev.filter(entry => entry.id !== availabilityId));
        }
        modals.closeConfirmation();
      },
    });
  };

  const handleRequestDelete = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    if (!spot) return;

    const details = OperationHandler.getConfirmationDetails('delete', spot);
    if (!details) return;

    modals.showConfirmation({
      title: details.title,
      message: details.message,
      confirmButtonText: details.confirmButtonText,
      confirmButtonVariant: details.variant,
      onConfirm: async () => {
        const result = await OperationHandler.handleDeleteSpot(spotId);
        if (result.success) {
          setParkingSpaces(prev => prev.filter(space => space.id !== spotId));
          setAvailabilities(prev => prev.filter(entry => entry.spotId !== spotId));
        }
        modals.closeConfirmation();
      },
    });
  };

  // Get view configuration
  const viewConfig = isAdmin
    ? ownedSpot
      ? ViewManager.getAdminWithSpotConfig(viewMode)
      : ViewManager.getAdminClaimingConfig(viewMode, weekOffset)
    : ViewManager.getUserConfig(viewMode, weekOffset, !!claimedAvailability);

  const emptyStateMessage = ViewManager.getEmptyStateMessage(
    isAdmin,
    viewMode,
    weekOffset,
    !!ownedSpot,
    !!claimedAvailability
  );

  const shouldShowWeekNavigation = ViewManager.shouldShowWeekNavigation(
    isAdmin,
    viewMode,
    !!ownedSpot,
    canClaimSpot
  );

  const bannerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.2)'
  };
  const viewControlsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' };
  const viewTitleStyle: React.CSSProperties = { margin: 0, fontWeight: 700, fontSize: '24px' };
  const toggleButtonStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", fontWeight: 500 };
  const weekButtonStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid white', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", fontWeight: 700, fontSize: '16px' };
  const disabledButtonStyle: React.CSSProperties = { opacity: 0.5, cursor: 'not-allowed', borderColor: 'rgba(255, 255, 255, 0.5)', color: 'rgba(255, 255, 255, 0.5)' };

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
                <h2 style={viewTitleStyle}>{viewConfig.title}</h2>
                 {shouldShowWeekNavigation && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button style={{ ...weekButtonStyle, ...(weekOffset === 0 && disabledButtonStyle) }} disabled={weekOffset === 0} onClick={handlePreviousWeek}>&lt; Prev</button>
                    <button style={{ ...weekButtonStyle, ...(weekOffset === 1 && disabledButtonStyle) }} disabled={weekOffset === 1} onClick={handleNextWeek}>Next &gt;</button>
                  </div>
                )}
              </div>
              <button style={toggleButtonStyle} onClick={() => setViewMode(viewMode === 'default' ? 'all' : 'default')}>{viewConfig.buttonText}</button>
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
                    onAssign={modals.openAssignModal}
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
                <p>{emptyStateMessage}</p>
                {isAdmin && viewMode === 'all' && <AddSpotCard onAddSpot={handleAddSpot} />}
              </div>
            )}
          </main>
        </>
      )}
      
      {modals.assignModalOpen && modals.selectedSpot && (
        <AssignOwnerModal
          spot={modals.selectedSpot}
          users={usersWithoutSpots}
          onAssign={handleAssignOwner}
          onClose={modals.closeAssignModal}
        />
      )}
      {modals.markAvailableModalOpen && modals.selectedSpot && (
        <MarkAvailableModal
          spot={modals.selectedSpot}
          onRequestMarkAvailable={async (spotId, startDate, endDate) => {
              const result = await handleRequestMarkAvailable(spotId, startDate, endDate);
              if (result.success) {
                modals.closeMarkAvailableModal();
              }
              return result;
            }}
          onClose={modals.closeMarkAvailableModal}
        />
      )}
      {modals.confirmationModalOpen && modals.confirmationAction && (
        <ConfirmationModal
          title={modals.confirmationAction.title}
          message={modals.confirmationAction.message}
          onConfirm={modals.confirmationAction.onConfirm}
          onClose={modals.closeConfirmation}
          confirmButtonText={modals.confirmationAction.confirmButtonText}
          confirmButtonVariant={modals.confirmationAction.confirmButtonVariant}
        />
      )}
    </div>
  );
};

export default App;
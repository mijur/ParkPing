
import React, { useState, useMemo } from 'react';
import { MOCK_USERS } from './constants';
import type { User, ParkingSpace, Availability } from './types';
import UserSwitcher from './components/UserSwitcher';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import AddSpotCard from './components/AddSpotCard';
import AssignOwnerModal from './components/modals/AssignOwnerModal';
import MarkAvailableModal from './components/modals/MarkAvailableModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import OwnerView from './components/OwnerView';
import { getToday, getTomorrow, toYYYYMMDD } from './utils/dateUtils';
import { Role } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[4]); // Default to a user with no spot
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([
    { id: 1, ownerId: 'user-1' },
    { id: 2, ownerId: 'user-2' },
    { id: 3, ownerId: 'user-3' },
    { id: 4, ownerId: 'user-4' },
    { id: 5, ownerId: null },
  ]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([
    {
      id: 'avail-1',
      spotId: 2,
      startDate: getToday(),
      endDate: getToday(),
      claimedById: 'user-5',
    },
    {
      id: 'avail-2',
      spotId: 3,
      startDate: getTomorrow(),
      endDate: (() => {
        const d = getTomorrow();
        d.setDate(d.getDate() + 3);
        return d;
      })(),
      claimedById: null,
    },
    {
      id: 'avail-3',
      spotId: 4,
      startDate: (() => { const d = new Date(); d.setDate(d.getDate() + 8); return d; })(),
      endDate: (() => { const d = new Date(); d.setDate(d.getDate() + 10); return d; })(),
      claimedById: null,
    }
  ]);

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
  const [weekOffset, setWeekOffset] = useState(0); // 0 for current week, 1 for next week

  const isAdmin = currentUser.role === Role.Admin;
  const usersWithoutSpots = useMemo(
    () => MOCK_USERS.filter(u => !parkingSpaces.some(p => p.ownerId === u.id) && u.role === Role.User),
    [parkingSpaces]
  );
  
  const ownedSpot = useMemo(
    () => parkingSpaces.find(p => p.ownerId === currentUser.id),
    [parkingSpaces, currentUser]
  );

  const claimedAvailability = useMemo(
    () => availabilities.find(a => a.claimedById === currentUser.id),
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
      return viewMode === 'default' ? parkingSpaces.filter(p => p.ownerId) : parkingSpaces;
    }

    if (viewMode === 'default' && !ownedSpot) {
      if (claimedAvailability) {
        return parkingSpaces.filter(space => space.id === claimedAvailability.spotId);
      }
      return parkingSpaces.filter(space =>
        availabilities.some(a =>
          a.spotId === space.id &&
          !a.claimedById &&
          a.startDate.getTime() <= endOfWeek.getTime() &&
          a.endDate.getTime() >= startOfWeek.getTime()
        )
      );
    }
    
    return parkingSpaces;
  }, [viewMode, isAdmin, parkingSpaces, availabilities, ownedSpot, claimedAvailability, weekOffset]);

  const handleNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 1));
  const handlePreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, 0));

  const handleAddSpot = () => {
    setParkingSpaces(prev => [...prev, { id: prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1, ownerId: null }]);
  };

  const handleOpenAssignModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setAssignModalOpen(true);
  };
  
  const handleAssignOwner = (spotId: number, ownerId: string) => {
    setParkingSpaces(prev => prev.map(p => p.id === spotId ? { ...p, ownerId } : p));
    setAssignModalOpen(false);
    setSelectedSpot(null);
  };

  const handleUnassignOwner = (spotId: number) => {
    setParkingSpaces(prev => prev.map(p => p.id === spotId ? { ...p, ownerId: null } : p));
  };
  
  const handleRequestUnassign = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    const owner = MOCK_USERS.find(u => u.id === spot?.ownerId);
    if (!spot || !owner) return;

    setConfirmationAction({
      title: 'Confirm Unassign',
      message: `Are you sure you want to unassign ${owner.name} from Spot #${spot.id}?`,
      onConfirm: () => {
        handleUnassignOwner(spotId);
        setConfirmationModalOpen(false);
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
  
  const handleRequestMarkAvailable = (spotId: number, startDate: Date, endDate: Date): { success: boolean, message: string } => {
    const newStart = new Date(startDate);
    newStart.setHours(0,0,0,0);
    const newEnd = new Date(endDate);
    newEnd.setHours(0,0,0,0);

    const overlappingAvailability = availabilities.find(existing => {
      if (existing.spotId !== spotId) return false;
      const existingStart = existing.startDate.getTime();
      const existingEnd = existing.endDate.getTime();
      return newStart.getTime() <= existingEnd && newEnd.getTime() >= existingStart;
    });

    const addNewAvailability = () => {
      setAvailabilities(prev => [...prev, {
        id: `avail-${Date.now()}`,
        spotId,
        startDate: newStart,
        endDate: newEnd,
        claimedById: null
      }]);
    };

    if (overlappingAvailability) {
      if (overlappingAvailability.claimedById) {
        return { success: false, message: 'This period overlaps with a claimed availability and cannot be changed.' };
      }

      setConfirmationAction({
        title: 'Overwrite Availability',
        message: `Your new availability overlaps with an existing one (${toYYYYMMDD(overlappingAvailability.startDate)} to ${toYYYYMMDD(overlappingAvailability.endDate)}). Do you want to replace it?`,
        onConfirm: () => {
          setAvailabilities(prev => {
            const filtered = prev.filter(a => a.id !== overlappingAvailability.id);
            return [...filtered, {
              id: `avail-${Date.now()}`,
              spotId,
              startDate: newStart,
              endDate: newEnd,
              claimedById: null
            }];
          });
          setConfirmationModalOpen(false);
        },
        confirmButtonText: 'Overwrite',
        confirmButtonVariant: 'destructive'
      });
      setConfirmationModalOpen(true);
      return { success: true, message: '' };
    }

    addNewAvailability();
    return { success: true, message: '' };
  };

  const handleClaimDay = (availabilityId: string, dayToClaim: Date) => {
    if (!canClaimSpot) return;

    const originalAvailability = availabilities.find(a => a.id === availabilityId);
    if (!originalAvailability || originalAvailability.claimedById) {
      console.error("Could not find availability or it's already claimed.");
      return;
    }

    dayToClaim.setHours(0, 0, 0, 0);

    const newAvailabilities: Availability[] = [];

    const claimedAvailability: Availability = {
      id: `avail-${Date.now()}`,
      spotId: originalAvailability.spotId,
      startDate: dayToClaim,
      endDate: dayToClaim,
      claimedById: currentUser.id,
    };
    newAvailabilities.push(claimedAvailability);

    const originalStart = originalAvailability.startDate.getTime();
    const originalEnd = originalAvailability.endDate.getTime();
    const claimTime = dayToClaim.getTime();

    if (claimTime > originalStart) {
      const beforeEndDate = new Date(dayToClaim);
      beforeEndDate.setDate(dayToClaim.getDate() - 1);
      
      newAvailabilities.push({
        id: `avail-${Date.now()}-before`,
        spotId: originalAvailability.spotId,
        startDate: originalAvailability.startDate,
        endDate: beforeEndDate,
        claimedById: null,
      });
    }

    if (claimTime < originalEnd) {
      const afterStartDate = new Date(dayToClaim);
      afterStartDate.setDate(dayToClaim.getDate() + 1);

      newAvailabilities.push({
        id: `avail-${Date.now()}-after`,
        spotId: originalAvailability.spotId,
        startDate: afterStartDate,
        endDate: originalAvailability.endDate,
        claimedById: null,
      });
    }

    setAvailabilities(prev => [
      ...prev.filter(a => a.id !== originalAvailability.id),
      ...newAvailabilities,
    ]);
  };
  
  const handleUnclaimSpot = (availabilityId: string) => {
    setAvailabilities(prev => prev.map(a => a.id === availabilityId ? { ...a, claimedById: null } : a));
  };
  
  const handleRequestUnclaim = (availabilityId: string) => {
      const availability = availabilities.find(a => a.id === availabilityId);
      if (!availability) return;

      setConfirmationAction({
          title: 'Confirm Unclaim',
          message: `Are you sure you want to unclaim your spot for ${availability.startDate.toLocaleDateString()}? This will make it available for others.`,
          onConfirm: () => {
              handleUnclaimSpot(availabilityId);
              setConfirmationModalOpen(false);
          },
          confirmButtonText: 'Yes, Unclaim',
          confirmButtonVariant: 'destructive'
      });
      setConfirmationModalOpen(true);
  }
  
  const handleUndoAvailability = (availabilityId: string) => {
    setAvailabilities(prev => prev.filter(a => a.id !== availabilityId));
  };

  const handleRequestUndoAvailability = (availabilityId: string) => {
    const availability = availabilities.find(a => a.id === availabilityId);
    if (!availability) return;

    setConfirmationAction({
        title: 'Confirm Undo Availability',
        message: `Are you sure you want to remove the availability for Spot #${availability.spotId} from ${availability.startDate.toLocaleDateString()} to ${availability.endDate.toLocaleDateString()}?`,
        onConfirm: () => {
            handleUndoAvailability(availabilityId);
            setConfirmationModalOpen(false);
        },
        confirmButtonText: 'Yes, Undo',
        confirmButtonVariant: 'destructive'
    });
    setConfirmationModalOpen(true);
  }

  const handleDeleteSpot = (spotId: number) => {
    setParkingSpaces(prev => prev.filter(p => p.id !== spotId));
    setAvailabilities(prev => prev.filter(a => a.spotId !== spotId));
  };
  
  const handleRequestDelete = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    if (!spot) return;
  
    setConfirmationAction({
      title: 'Confirm Deletion',
      message: `Are you sure you want to permanently delete Spot #${spot.id}? This action cannot be undone.`,
      onConfirm: () => {
        handleDeleteSpot(spotId);
        setConfirmationModalOpen(false);
      },
      confirmButtonText: 'Delete Spot',
      confirmButtonVariant: 'destructive'
    });
    setConfirmationModalOpen(true);
  };
  
  const bannerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const viewControlsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  };

  const viewTitleStyle: React.CSSProperties = {
    margin: 0,
    fontWeight: 700,
    fontSize: '24px',
  };

  const toggleButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: '1px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'white',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
    fontWeight: 500,
  };

  const weekButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'white',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
    fontWeight: 700,
    fontSize: '16px',
  };

  const disabledButtonStyle: React.CSSProperties = {
    opacity: 0.5,
    cursor: 'not-allowed',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    color: 'rgba(255, 255, 255, 0.5)',
  };
  
  const getViewConfig = () => {
    if (isAdmin) {
      return viewMode === 'default'
        ? { title: 'Owned Spots', buttonText: 'Show All Spots' }
        : { title: 'All Spots', buttonText: 'Show Owned Only' };
    }
    if (viewMode === 'default') {
      if (claimedAvailability) {
        return { title: 'Your Claimed Spot', buttonText: 'Show All Spots' };
      }
      const weekTitle = weekOffset === 0 ? 'This Week' : 'Next Week';
      return { title: `Available ${weekTitle}`, buttonText: 'Show All Spots' };
    }
    // 'all' view for non-admin
    const buttonText = claimedAvailability ? 'Show My Claimed Spot' : 'Show Available This Week';
    return { title: 'All Spots', buttonText };
  };

  const { title, buttonText } = getViewConfig();


  const getEmptyStateMessage = () => {
    if (isAdmin) {
      return viewMode === 'default' ? 'No spots are currently assigned to users.' : 'There are no spots in the system. Add one!';
    }
    if (claimedAvailability) {
        return 'Could not find your claimed spot.';
    }
    const weekText = weekOffset === 0 ? 'this week' : 'next week';
    return viewMode === 'default' ? `No parking spots are available ${weekText}. Please check back later.` : 'There are no spots in the system.';
  }

  return (
    <div style={{ fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", padding: '40px', backgroundColor: '#5A48E5', minHeight: '100vh', color: 'white' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 700, margin: 0 }}>ParkPing</h1>
        <UserSwitcher
          users={MOCK_USERS}
          currentUser={currentUser}
          onUserChange={(user) => {
            setCurrentUser(user);
            setViewMode('default');
            setWeekOffset(0);
          }}
        />
      </header>

      {ownedSpot && !isAdmin ? (
        <OwnerView
          spot={ownedSpot}
          availabilities={availabilities.filter(a => a.spotId === ownedSpot.id)}
          onRequestMarkAvailable={(startDate, endDate) => handleRequestMarkAvailable(ownedSpot.id, startDate, endDate)}
          onUndoAvailability={handleRequestUndoAvailability}
        />
      ) : (
        <>
          {userHasClaimedSpot && !isAdmin && viewMode === 'all' && (
             <div style={bannerStyle}>
               You have already claimed a spot. You can only claim one spot at a time.
             </div>
          )}
          <main>
            <div style={viewControlsStyle}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={viewTitleStyle}>{title}</h2>
                 {viewMode === 'default' && !ownedSpot && !isAdmin && !claimedAvailability && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        style={{ ...weekButtonStyle, ...(weekOffset === 0 && disabledButtonStyle) }}
                        disabled={weekOffset === 0}
                        onClick={handlePreviousWeek}
                    >
                        &lt; Prev
                    </button>
                    <button
                        style={{ ...weekButtonStyle, ...(weekOffset === 1 && disabledButtonStyle) }}
                        disabled={weekOffset === 1}
                        onClick={handleNextWeek}
                    >
                        Next &gt;
                    </button>
                  </div>
                )}
              </div>
              <button style={toggleButtonStyle} onClick={() => setViewMode(prev => prev === 'default' ? 'all' : 'default')}>
                 {buttonText}
              </button>
            </div>
            
            {displayedSpaces.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {displayedSpaces.map(space => (
                  <ParkingSpaceCard
                    key={space.id}
                    space={space}
                    owner={MOCK_USERS.find(u => u.id === space.ownerId)}
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
          onRequestMarkAvailable={(spotId, startDate, endDate) => {
              const result = handleRequestMarkAvailable(spotId, startDate, endDate);
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
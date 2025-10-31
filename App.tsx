import React, { useState, useMemo } from 'react';
import { MOCK_USERS } from './constants';
import type { User, ParkingSpace, Availability } from './types';
import UserSwitcher from './components/UserSwitcher';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import AddSpotCard from './components/AddSpotCard';
import AssignOwnerModal from './components/modals/AssignOwnerModal';
import MarkAvailableModal from './components/modals/MarkAvailableModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import { getToday } from './utils/dateUtils';
import { Role } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
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

  const isAdmin = currentUser.role === Role.Admin;
  const usersWithoutSpots = useMemo(
    () => MOCK_USERS.filter(u => !parkingSpaces.some(p => p.ownerId === u.id) && u.role === Role.User),
    [parkingSpaces]
  );
  
  const currentUserOwnsSpot = useMemo(
    () => parkingSpaces.some(p => p.ownerId === currentUser.id),
    [parkingSpaces, currentUser]
  );

  const userHasClaimedSpot = useMemo(
    () => availabilities.some(a => a.claimedById === currentUser.id),
    [availabilities, currentUser]
  );
  
  const canClaimSpot = !currentUserOwnsSpot && !userHasClaimedSpot;

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
  
  const handleMarkAvailable = (spotId: number, startDate: Date, endDate: Date) => {
    setAvailabilities(prev => [...prev, {
      id: `avail-${Date.now()}`,
      spotId,
      startDate,
      endDate,
      claimedById: null
    }]);
    setMarkAvailableModalOpen(false);
    setSelectedSpot(null);
  };

  const handleClaimSpot = (availabilityId: string) => {
    if (!canClaimSpot) return;
    setAvailabilities(prev => prev.map(a => a.id === availabilityId ? { ...a, claimedById: currentUser.id } : a));
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
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  return (
    <div style={{ fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", padding: '40px', backgroundColor: '#5A48E5', minHeight: '100vh', color: 'white' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 700, margin: 0 }}>ParkPing</h1>
        <UserSwitcher
          users={MOCK_USERS}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
        />
      </header>
      {currentUserOwnsSpot ? (
        <div style={bannerStyle}>
          You own a parking spot, so you cannot claim other available spots.
        </div>
      ) : userHasClaimedSpot ? (
        <div style={bannerStyle}>
          You have already claimed a spot. You can only claim one spot at a time.
        </div>
      ) : null}
      <main>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {parkingSpaces.map(space => (
            <ParkingSpaceCard
              key={space.id}
              space={space}
              owner={MOCK_USERS.find(u => u.id === space.ownerId)}
              availabilities={availabilities.filter(a => a.spotId === space.id)}
              currentUser={currentUser}
              isAdmin={isAdmin}
              canClaimSpot={canClaimSpot}
              onAssign={handleOpenAssignModal}
              onUnassign={handleRequestUnassign}
              onMarkAvailable={handleOpenMarkAvailableModal}
              onClaim={handleClaimSpot}
              onUnclaim={handleRequestUnclaim}
              onDelete={handleRequestDelete}
            />
          ))}
          {isAdmin && <AddSpotCard onAddSpot={handleAddSpot} />}
        </div>
      </main>
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
          onMarkAvailable={handleMarkAvailable}
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
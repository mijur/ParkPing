import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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

type UserRecord = User & { email: string; password: string };

interface PersistedData {
  users: UserRecord[];
  parkingSpaces: ParkingSpace[];
  availabilities: Availability[];
  currentUserId: string | null;
}

const STORAGE_KEY = 'parkping-data';

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

const clonePersistedData = (data: PersistedData): PersistedData => ({
  users: data.users.map(user => ({ ...user })),
  parkingSpaces: data.parkingSpaces.map(space => ({ ...space })),
  availabilities: data.availabilities.map(avail => ({
    ...avail,
    startDate: normalizeDate(avail.startDate),
    endDate: normalizeDate(avail.endDate),
  })),
  currentUserId: data.currentUserId,
});

const DEFAULT_DATA: PersistedData = {
  users: [
    {
      id: 'admin',
      name: 'Admin',
      role: Role.Admin,
      email: 'admin@parkping.local',
      password: 'admin123',
    },
  ],
  parkingSpaces: [
    { id: 1, ownerId: null },
    { id: 2, ownerId: null },
    { id: 3, ownerId: null },
  ],
  availabilities: [],
  currentUserId: null,
};

const sanitizeUserRecord = (entry: any): UserRecord => ({
  id: typeof entry?.id === 'string' ? entry.id : generateId(),
  name: typeof entry?.name === 'string' ? entry.name : 'User',
  role: entry?.role === Role.Admin ? Role.Admin : Role.User,
  email: typeof entry?.email === 'string' ? entry.email : '',
  password: typeof entry?.password === 'string' ? entry.password : '',
});

const sanitizeParkingSpace = (entry: any): ParkingSpace => {
  const numericId = Number(entry?.id);
  return {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : 0,
    ownerId: typeof entry?.ownerId === 'string' ? entry.ownerId : null,
  };
};

const sanitizeAvailability = (entry: any): Availability => {
  const spotId = Number(entry?.spotId);
  const start = entry?.startDate ? normalizeDate(new Date(entry.startDate)) : normalizeDate(new Date());
  const endCandidate = entry?.endDate ? normalizeDate(new Date(entry.endDate)) : start;
  const end = endCandidate.getTime() < start.getTime() ? start : endCandidate;
  return {
    id: typeof entry?.id === 'string' ? entry.id : generateId(),
    spotId: Number.isFinite(spotId) ? spotId : 0,
    startDate: start,
    endDate: end,
    claimedById: typeof entry?.claimedById === 'string' ? entry.claimedById : null,
  };
};

const loadPersistedData = (): PersistedData => {
  const fallback = clonePersistedData(DEFAULT_DATA);
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed?.users)
      ? parsed.users.map(sanitizeUserRecord)
      : fallback.users;
    const spaces = Array.isArray(parsed?.parkingSpaces)
      ? parsed.parkingSpaces.map(sanitizeParkingSpace).filter(space => space.id > 0)
      : fallback.parkingSpaces;
    const availabilities = Array.isArray(parsed?.availabilities)
      ? sortAvailabilities(parsed.availabilities.map(sanitizeAvailability).filter(av => av.spotId > 0))
      : fallback.availabilities;
    const userIds = new Set(users.map(user => user.id));
    const currentUserId = typeof parsed?.currentUserId === 'string' && userIds.has(parsed.currentUserId)
      ? parsed.currentUserId
      : null;

    return {
      users,
      parkingSpaces: spaces,
      availabilities,
      currentUserId,
    };
  } catch {
    return fallback;
  }
};

const App: React.FC = () => {
  const initialDataRef = useRef<PersistedData | null>(null);
  if (!initialDataRef.current) {
    initialDataRef.current = loadPersistedData();
  }

  const [userRecords, setUserRecords] = useState<UserRecord[]>(() => initialDataRef.current!.users);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>(() => initialDataRef.current!.parkingSpaces);
  const [availabilities, setAvailabilities] = useState<Availability[]>(() => sortAvailabilities(initialDataRef.current!.availabilities));
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => initialDataRef.current!.currentUserId);
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

  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const payload: PersistedData = {
      users: userRecords,
      parkingSpaces,
      availabilities,
      currentUserId,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [userRecords, parkingSpaces, availabilities, currentUserId]);

  const users: User[] = useMemo(
    () => userRecords.map(({ email, password, ...rest }) => ({ ...rest })),
    [userRecords]
  );

  const currentUser = useMemo(
    () => (currentUserId ? users.find(user => user.id === currentUserId) ?? null : null),
    [users, currentUserId]
  );
  
  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const match = userRecords.find(
      user => user.email.toLowerCase() === normalizedEmail && user.password === password
    );

    if (!match) {
      return { success: false, message: 'Invalid email or password.' };
    }

    setCurrentUserId(match.id);
    return { success: true, message: '' };
  }, [userRecords]);

  const handleEmailSignUp = useCallback(async (email: string, password: string, name: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (userRecords.some(user => user.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser: UserRecord = {
      id: generateId(),
      name: name.trim() || 'New User',
      role: userRecords.length === 0 ? Role.Admin : Role.User,
      email: normalizedEmail,
      password,
    };

    setUserRecords(prev => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    return { success: true, message: '' };
  }, [userRecords]);

  const handleLogout = () => setCurrentUserId(null);

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
  }, [viewMode, isAdmin, parkingSpaces, availabilities, ownedSpot, claimedAvailability, weekOffset]);

  const handleNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 1));
  const handlePreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, 0));

  const handleAddSpot = async () => {
    setParkingSpaces(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(space => space.id)) + 1 : 1;
      return [...prev, { id: nextId, ownerId: null }];
    });
  };

  const handleOpenAssignModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setAssignModalOpen(true);
  };
  
  const handleAssignOwner = async (spotId: number, ownerId: string) => {
    setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId } : space)));
    setAssignModalOpen(false);
    setSelectedSpot(null);
  };
  
  const handleRequestUnassign = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    const owner = users.find(u => u.id === spot?.ownerId);
    if (!spot || !owner) return;

    setConfirmationAction({
      title: 'Confirm Unassign',
      message: `Are you sure you want to unassign ${owner.name} from Spot #${spot.id}?`,
      onConfirm: async () => {
        setParkingSpaces(prev => prev.map(space => (space.id === spotId ? { ...space, ownerId: null } : space)));
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
        onConfirm: () => {
          setAvailabilities(prev => {
            const filtered = prev.filter(entry => entry.id !== overlapping.id);
            const updated = [
              ...filtered,
              {
                id: generateId(),
                spotId,
                startDate: normalizedStart,
                endDate: normalizedEnd,
                claimedById: null,
              },
            ];
            return sortAvailabilities(updated);
          });
          setConfirmationModalOpen(false);
        },
        confirmButtonText: 'Overwrite',
      });
      setConfirmationModalOpen(true);
      return { success: true, message: '' };
    }

    setAvailabilities(prev =>
      sortAvailabilities([
        ...prev,
        {
          id: generateId(),
          spotId,
          startDate: normalizedStart,
          endDate: normalizedEnd,
          claimedById: null,
        },
      ])
    );
    return { success: true, message: '' };
  };

  const handleClaimDay = async (availabilityId: string, dayToClaim: Date) => {
    if (!canClaimSpot || !currentUser) return;
    const normalizedDay = normalizeDate(dayToClaim);

    setAvailabilities(prev => {
      const target = prev.find(entry => entry.id === availabilityId);
      if (!target || target.claimedById) {
        return prev;
      }

      const start = normalizeDate(target.startDate);
      const end = normalizeDate(target.endDate);
      if (normalizedDay.getTime() < start.getTime() || normalizedDay.getTime() > end.getTime()) {
        return prev;
      }

      const remaining = prev.filter(entry => entry.id !== availabilityId);
      const updates: Availability[] = [
        ...remaining,
        {
          id: generateId(),
          spotId: target.spotId,
          startDate: normalizedDay,
          endDate: normalizedDay,
          claimedById: currentUser.id,
        },
      ];

      if (normalizedDay.getTime() > start.getTime()) {
        updates.push({
          id: generateId(),
          spotId: target.spotId,
          startDate: start,
          endDate: addDays(normalizedDay, -1),
          claimedById: null,
        });
      }

      if (normalizedDay.getTime() < end.getTime()) {
        updates.push({
          id: generateId(),
          spotId: target.spotId,
          startDate: addDays(normalizedDay, 1),
          endDate: end,
          claimedById: null,
        });
      }

      return sortAvailabilities(updates);
    });
  };
  
  const handleRequestUnclaim = (availabilityId: string) => {
      const availability = availabilities.find(a => a.id === availabilityId);
      if (!availability) return;

      setConfirmationAction({
          title: 'Confirm Unclaim',
          message: `Are you sure you want to unclaim your spot for ${availability.startDate.toLocaleDateString()}?`,
          onConfirm: async () => {
            setAvailabilities(prev => prev.map(entry => entry.id === availabilityId ? { ...entry, claimedById: null } : entry));
            setConfirmationModalOpen(false);
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
          setAvailabilities(prev => prev.filter(entry => entry.id !== availabilityId));
          setConfirmationModalOpen(false);
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
        setParkingSpaces(prev => prev.filter(space => space.id !== spotId));
        setAvailabilities(prev => prev.filter(entry => entry.spotId !== spotId));
        setConfirmationModalOpen(false);
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
                 {viewMode === 'default' && !ownedSpot && !isAdmin && (
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
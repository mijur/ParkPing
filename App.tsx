import React, { useState, useMemo, useEffect } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, query, where, writeBatch, getDocs, Timestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';

import type { User, ParkingSpace, Availability, AvailabilityFirestore } from './types';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import AddSpotCard from './components/AddSpotCard';
import AssignOwnerModal from './components/modals/AssignOwnerModal';
import MarkAvailableModal from './components/modals/MarkAvailableModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import OwnerView from './components/OwnerView';
import { getToday, toYYYYMMDD } from './utils/dateUtils';
import { Role } from './types';

const fromFirestoreAvailability = (doc: any): Availability => {
    const data = doc.data() as AvailabilityFirestore;
    return {
        id: doc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
    };
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            role: userDocSnap.data().role as Role,
          });
        } else {
          const newUser = { name: firebaseUser.displayName || 'New User', role: Role.User };
          await setDoc(userDocRef, newUser);
          setCurrentUser({ id: firebaseUser.uid, ...newUser });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    const spacesUnsub = onSnapshot(collection(db, 'parkingSpaces'), (snapshot) => {
        const spaces = snapshot.docs.map(doc => ({ ...doc.data() } as ParkingSpace)).sort((a, b) => a.id - b.id);
        setParkingSpaces(spaces);
    });

    const availabilitiesUnsub = onSnapshot(collection(db, 'availabilities'), (snapshot) => {
        setAvailabilities(snapshot.docs.map(fromFirestoreAvailability));
    });

    return () => {
      unsubscribeAuth();
      usersUnsub();
      spacesUnsub();
      availabilitiesUnsub();
    };
  }, []);
  
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const isAdmin = currentUser?.role === Role.Admin;
  const usersWithoutSpots = useMemo(
    () => allUsers.filter(u => !parkingSpaces.some(p => p.ownerId === u.id) && u.role === Role.User),
    [allUsers, parkingSpaces]
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
    const newId = parkingSpaces.length > 0 ? Math.max(...parkingSpaces.map(p => p.id)) + 1 : 1;
    await setDoc(doc(db, "parkingSpaces", String(newId)), { id: newId, ownerId: null });
  };

  const handleOpenAssignModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot);
    setAssignModalOpen(true);
  };
  
  const handleAssignOwner = async (spotId: number, ownerId: string) => {
    await updateDoc(doc(db, "parkingSpaces", String(spotId)), { ownerId });
    setAssignModalOpen(false);
    setSelectedSpot(null);
  };
  
  const handleRequestUnassign = (spotId: number) => {
    const spot = parkingSpaces.find(p => p.id === spotId);
    const owner = allUsers.find(u => u.id === spot?.ownerId);
    if (!spot || !owner) return;

    setConfirmationAction({
      title: 'Confirm Unassign',
      message: `Are you sure you want to unassign ${owner.name} from Spot #${spot.id}?`,
      onConfirm: async () => {
        await updateDoc(doc(db, "parkingSpaces", String(spotId)), { ownerId: null });
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
  
  const handleRequestMarkAvailable = async (spotId: number, startDate: Date, endDate: Date): Promise<{ success: boolean, message: string }> => {
    const newStart = Timestamp.fromDate(startDate);
    const newEnd = Timestamp.fromDate(endDate);

    const q = query(collection(db, "availabilities"), where("spotId", "==", spotId));
    const querySnapshot = await getDocs(q);
    const overlapping = querySnapshot.docs.find(docSnap => {
        const d = docSnap.data();
        return newStart.seconds <= d.endDate.seconds && newEnd.seconds >= d.startDate.seconds;
    });

    if (overlapping) {
      if (overlapping.data().claimedById) {
        return { success: false, message: 'This period overlaps with a claimed availability and cannot be changed.' };
      }
      setConfirmationAction({
        title: 'Overwrite Availability',
        message: `Your new availability overlaps with an existing one. Do you want to replace it?`,
        onConfirm: async () => {
          const batch = writeBatch(db);
          batch.delete(doc(db, "availabilities", overlapping.id));
          batch.set(doc(collection(db, "availabilities")), { spotId, startDate: newStart, endDate: newEnd, claimedById: null });
          await batch.commit();
          setConfirmationModalOpen(false);
        },
        confirmButtonText: 'Overwrite',
      });
      setConfirmationModalOpen(true);
      return { success: true, message: '' };
    } else {
        await addDoc(collection(db, "availabilities"), { spotId, startDate: newStart, endDate: newEnd, claimedById: null });
        return { success: true, message: '' };
    }
  };

  const handleClaimDay = async (availabilityId: string, dayToClaim: Date) => {
    if (!canClaimSpot || !currentUser) return;
    try {
      await runTransaction(db, async (transaction) => {
        const availDocRef = doc(db, 'availabilities', availabilityId);
        const availDoc = await transaction.get(availDocRef);
        if (!availDoc.exists() || availDoc.data().claimedById) {
          throw new Error("Availability not found or already claimed!");
        }

        const original = fromFirestoreAvailability(availDoc);
        dayToClaim.setHours(0, 0, 0, 0);

        transaction.delete(availDocRef);

        const newClaimedRef = doc(collection(db, 'availabilities'));
        transaction.set(newClaimedRef, {
          spotId: original.spotId,
          startDate: Timestamp.fromDate(dayToClaim),
          endDate: Timestamp.fromDate(dayToClaim),
          claimedById: currentUser.id
        });

        if (dayToClaim.getTime() > original.startDate.getTime()) {
            const beforeEndDate = new Date(dayToClaim);
            beforeEndDate.setDate(dayToClaim.getDate() - 1);
            const beforeRef = doc(collection(db, 'availabilities'));
            transaction.set(beforeRef, {
                spotId: original.spotId,
                startDate: Timestamp.fromDate(original.startDate),
                endDate: Timestamp.fromDate(beforeEndDate),
                claimedById: null
            });
        }
        if (dayToClaim.getTime() < original.endDate.getTime()) {
            const afterStartDate = new Date(dayToClaim);
            afterStartDate.setDate(dayToClaim.getDate() + 1);
            const afterRef = doc(collection(db, 'availabilities'));
            transaction.set(afterRef, {
                spotId: original.spotId,
                startDate: Timestamp.fromDate(afterStartDate),
                endDate: Timestamp.fromDate(original.endDate),
                claimedById: null
            });
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  };
  
  const handleRequestUnclaim = (availabilityId: string) => {
      const availability = availabilities.find(a => a.id === availabilityId);
      if (!availability) return;

      setConfirmationAction({
          title: 'Confirm Unclaim',
          message: `Are you sure you want to unclaim your spot for ${availability.startDate.toLocaleDateString()}?`,
          onConfirm: async () => {
              await updateDoc(doc(db, "availabilities", availabilityId), { claimedById: null });
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
            await deleteDoc(doc(db, "availabilities", availabilityId));
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
        const batch = writeBatch(db);
        batch.delete(doc(db, "parkingSpaces", String(spotId)));
        const availsQuery = query(collection(db, "availabilities"), where("spotId", "==", spotId));
        const availsToDelete = await getDocs(availsQuery);
        availsToDelete.forEach(d => batch.delete(d.ref));
        await batch.commit();
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
  const loginButtonStyle: React.CSSProperties = { padding: '12px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'white', color: '#5A48E5', fontWeight: 700, fontFamily: "'Poppins', 'Source Serif Pro', sans-serif", fontSize: '18px' };
  
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
        {currentUser ? (
          <div style={{textAlign: 'right'}}>
            <p style={{margin: '0 0 8px 0'}}>Welcome, {currentUser.name}</p>
            <button onClick={handleLogout} style={{...toggleButtonStyle, borderColor: '#FFB8B8', color: '#FFB8B8'}}>Logout</button>
          </div>
        ) : (
          <button onClick={handleLogin} style={loginButtonStyle}>Sign in with Google</button>
        )}
      </header>

      {!currentUser ? (
        <div style={bannerStyle}>Please sign in to manage and claim parking spots.</div>
      ) : ownedSpot && !isAdmin ? (
        <OwnerView
          spot={ownedSpot}
          users={allUsers}
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
                    owner={allUsers.find(u => u.id === space.ownerId)}
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
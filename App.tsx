
import React, { useState, useMemo } from 'react';
import type { User, ParkingSpace, Availability } from './types';
import { Role } from './types';
import { TOTAL_SPOTS, MOCK_USERS } from './constants';
import UserSwitcher from './components/UserSwitcher';
import ParkingSpaceCard from './components/ParkingSpaceCard';
import { getToday } from './utils/dateUtils';

// Initial state setup outside component to prevent re-creation on re-renders
const initialParkingSpaces: ParkingSpace[] = Array.from({ length: TOTAL_SPOTS }, (_, i) => ({
  id: i + 1,
  ownerId: i < 4 ? `user-${i + 1}` : null, // Assign first 4 spots to first 4 users
}));

const App: React.FC = () => {
  const [users] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>(initialParkingSpaces);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const handleAssignOwner = (spotId: number, userId: string | null) => {
    setParkingSpaces(prevSpaces => {
      // If assigning a user, first make sure they don't own another spot
      if (userId) {
        const alreadyOwnsSpot = prevSpaces.some(s => s.ownerId === userId);
        if (alreadyOwnsSpot) {
          alert(`${users.find(u => u.id === userId)?.name} already owns another spot.`);
          return prevSpaces;
        }
      }
      
      return prevSpaces.map(space => 
        space.id === spotId ? { ...space, ownerId: userId } : space
      );
    });
  };

  const handleMarkAvailable = (spotId: number, startDate: Date, endDate: Date) => {
    // Prevent adding availability if already exists for these days to simplify logic
    const today = getToday();
    const existingAvailability = availabilities.find(a => 
        a.spotId === spotId && a.startDate <= today && a.endDate >= today
    );
    if(existingAvailability){
        alert("This spot is already marked as available for today.");
        return;
    }

    const newAvailability: Availability = {
      id: `avail-${Date.now()}`,
      spotId,
      startDate,
      endDate,
      claimedById: null,
    };
    setAvailabilities(prev => [...prev, newAvailability]);
  };

  const handleClaimSpot = (spotId: number, availabilityId: string) => {
    setAvailabilities(prevAvailabilities => {
      const targetAvailability = prevAvailabilities.find(a => a.id === availabilityId);
      
      // Concurrency check
      if (targetAvailability?.claimedById) {
        alert('Sorry, this spot was just claimed by someone else.');
        return prevAvailabilities;
      }
      
      return prevAvailabilities.map(a => 
        a.id === availabilityId ? { ...a, claimedById: currentUser.id } : a
      );
    });
  };

  const isClaimedByCurrentUserToday = useMemo(() => {
    const today = getToday();
    return availabilities.some(a => 
        a.claimedById === currentUser.id &&
        a.startDate <= today && 
        a.endDate >= today
    );
  }, [availabilities, currentUser.id]);

  const currentUserHasOwnedSpot = useMemo(() => {
    return parkingSpaces.some(p => p.ownerId === currentUser.id);
  }, [parkingSpaces, currentUser.id]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 p-6 bg-white rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">ParkPing</h1>
            <p className="text-gray-500 mt-1">Your smart parking space manager.</p>
          </div>
          <UserSwitcher users={users} currentUser={currentUser} onUserChange={setCurrentUser} />
        </header>

        <main>
          {currentUserHasOwnedSpot && (
             <div className="mb-6 p-4 bg-blue-100 text-blue-800 border-l-4 border-blue-500 rounded-md shadow">
                You own a parking spot, so you cannot claim other available spots.
             </div>
          )}
          {isClaimedByCurrentUserToday && (
              <div className="mb-6 p-4 bg-green-100 text-green-800 border-l-4 border-green-500 rounded-md shadow">
                You have claimed a spot for today.
             </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
            {parkingSpaces.map(spot => (
              <ParkingSpaceCard
                key={spot.id}
                spot={spot}
                availabilities={availabilities}
                currentUser={currentUser}
                users={users}
                onAssign={handleAssignOwner}
                onMarkAvailable={handleMarkAvailable}
                onClaim={handleClaimSpot}
                isClaimedByCurrentUserToday={isClaimedByCurrentUserToday}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

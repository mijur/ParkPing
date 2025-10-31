
import React, { useState, useMemo } from 'react';
import type { User, ParkingSpace, Availability } from '../types';
import { Role } from '../types';
import { getToday } from '../utils/dateUtils';
import AssignOwnerModal from './modals/AssignOwnerModal';
import MarkAvailableModal from './modals/MarkAvailableModal';

interface ParkingSpaceCardProps {
  spot: ParkingSpace;
  availabilities: Availability[];
  currentUser: User;
  users: User[];
  onAssign: (spotId: number, userId: string | null) => void;
  onMarkAvailable: (spotId: number, startDate: Date, endDate: Date) => void;
  onClaim: (spotId: number, availabilityId: string) => void;
  isClaimedByCurrentUserToday: boolean;
}

const ParkingSpaceCard: React.FC<ParkingSpaceCardProps> = ({
  spot,
  availabilities,
  currentUser,
  users,
  onAssign,
  onMarkAvailable,
  onClaim,
  isClaimedByCurrentUserToday
}) => {
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isAvailableModalOpen, setAvailableModalOpen] = useState(false);

  const owner = useMemo(() => users.find(u => u.id === spot.ownerId), [users, spot.ownerId]);

  const todaysAvailability = useMemo(() => {
    const today = getToday();
    return availabilities.find(a => 
      a.spotId === spot.id && 
      a.startDate <= today && 
      a.endDate >= today
    );
  }, [availabilities, spot.id]);
  
  const claimer = useMemo(() => {
      if (todaysAvailability?.claimedById) {
          return users.find(u => u.id === todaysAvailability.claimedById);
      }
      return null;
  }, [users, todaysAvailability]);

  const isOwnedByCurrentUser = spot.ownerId === currentUser.id;
  const currentUserHasSpot = useMemo(() => users.some(u => u.id === currentUser.id && !!spot.ownerId), [users, currentUser, spot]);


  // Determine card status and styles
  const getStatus = () => {
    if (todaysAvailability) {
      if (claimer) {
        return {
          text: `Claimed by ${claimer.name}`,
          bg: 'bg-yellow-100',
          border: 'border-yellow-400',
          textClass: 'text-yellow-800'
        };
      }
      return {
        text: 'Available Today',
        bg: 'bg-green-100',
        border: 'border-green-400',
        textClass: 'text-green-800'
      };
    }
    if (owner) {
      return {
        text: `Owned by ${owner.name}`,
        bg: 'bg-blue-100',
        border: 'border-blue-400',
        textClass: 'text-blue-800'
      };
    }
    return {
      text: 'Unassigned',
      bg: 'bg-gray-200',
      border: 'border-gray-400',
      textClass: 'text-gray-600'
    };
  };

  const status = getStatus();
  const cardBorder = isOwnedByCurrentUser ? 'border-indigo-500 border-2' : status.border;

  const canClaim = !users.find(u => u.id === currentUser.id && spot.ownerId === u.id) && 
                   !isClaimedByCurrentUserToday && 
                   todaysAvailability && 
                   !todaysAvailability.claimedById;

  return (
    <>
      <div className={`rounded-lg shadow-sm p-4 flex flex-col justify-between transition-all duration-200 h-48 ${status.bg} border ${cardBorder}`}>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-bold text-gray-700">{spot.id}</span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.textClass}`}>{status.text}</span>
          </div>
        </div>
        
        <div className="mt-auto space-y-2">
            {currentUser.role === Role.Admin && (
                 <button onClick={() => setAssignModalOpen(true)} className="w-full text-xs bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors">Manage Owner</button>
            )}
            {isOwnedByCurrentUser && (
                <button onClick={() => setAvailableModalOpen(true)} className="w-full text-xs bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors">Mark Available</button>
            )}
            {canClaim && todaysAvailability && (
                 <button onClick={() => onClaim(spot.id, todaysAvailability.id)} className="w-full text-xs bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition-colors">Claim Spot</button>
            )}
        </div>
      </div>
      
      {currentUser.role === Role.Admin && (
        <AssignOwnerModal
            isOpen={isAssignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            spot={spot}
            users={users.filter(u => !u.role.includes(Role.Admin) && !users.find(user => spot.ownerId === user.id))}
            onAssign={onAssign}
            currentOwnerName={owner?.name || null}
        />
      )}

      {isOwnedByCurrentUser && (
          <MarkAvailableModal
            isOpen={isAvailableModalOpen}
            onClose={() => setAvailableModalOpen(false)}
            spotId={spot.id}
            onMarkAvailable={onMarkAvailable}
          />
      )}
    </>
  );
};

export default ParkingSpaceCard;

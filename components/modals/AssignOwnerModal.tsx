
import React, { useState } from 'react';
import type { User, ParkingSpace } from '../../types';

interface AssignOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spot: ParkingSpace;
  users: User[];
  onAssign: (spotId: number, userId: string | null) => void;
  currentOwnerName: string | null;
}

const AssignOwnerModal: React.FC<AssignOwnerModalProps> = ({ isOpen, onClose, spot, users, onAssign, currentOwnerName }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(spot.ownerId);

  if (!isOpen) return null;

  const handleAssign = () => {
    onAssign(spot.id, selectedUserId);
    onClose();
  };
  
  const handleUnassign = () => {
    onAssign(spot.id, null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Spot #{spot.id}</h2>
        <p className="mb-4 text-gray-600">
          Currently assigned to: <span className="font-semibold">{currentOwnerName || 'No one'}</span>
        </p>
        <div className="mb-4">
          <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
            Assign to new owner:
          </label>
          <select
            id="user-select"
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">-- Select a user --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end items-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          {spot.ownerId && (
             <button
                onClick={handleUnassign}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Unassign Current Owner
              </button>
          )}
          <button
            onClick={handleAssign}
            disabled={selectedUserId === spot.ownerId}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            Save Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignOwnerModal;

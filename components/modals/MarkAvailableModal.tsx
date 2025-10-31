
import React, { useState } from 'react';
import { getToday, getTomorrow } from '../../utils/dateUtils';

interface MarkAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotId: number;
  onMarkAvailable: (spotId: number, startDate: Date, endDate: Date) => void;
}

const MarkAvailableModal: React.FC<MarkAvailableModalProps> = ({ isOpen, onClose, spotId, onMarkAvailable }) => {
  const [forToday, setForToday] = useState(false);
  const [forTomorrow, setForTomorrow] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!forToday && !forTomorrow) {
      alert('Please select at least one day.');
      return;
    }

    const today = getToday();
    const tomorrow = getTomorrow();

    let startDate: Date;
    let endDate: Date;

    if (forToday && forTomorrow) {
      startDate = today;
      endDate = tomorrow;
    } else if (forToday) {
      startDate = today;
      endDate = today;
    } else { // Only forTomorrow
      startDate = tomorrow;
      endDate = tomorrow;
    }

    onMarkAvailable(spotId, startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Mark Spot #{spotId} Available</h2>
        <p className="text-gray-600 mb-4">Select the days you want to make your spot available for others to claim.</p>
        <div className="space-y-4">
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="today"
                name="today"
                type="checkbox"
                checked={forToday}
                onChange={(e) => setForToday(e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="today" className="font-medium text-gray-700">Today</label>
            </div>
          </div>
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="tomorrow"
                name="tomorrow"
                type="checkbox"
                checked={forTomorrow}
                onChange={(e) => setForTomorrow(e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="tomorrow" className="font-medium text-gray-700">Tomorrow</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!forToday && !forTomorrow}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
          >
            Confirm Availability
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkAvailableModal;

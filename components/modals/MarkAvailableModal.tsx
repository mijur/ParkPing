import React, { useState } from 'react';
import type { ParkingSpace } from '../../types';
import { getToday, getTomorrow, toYYYYMMDD, parseYYYYMMDD } from '../../utils/dateUtils';

interface MarkAvailableModalProps {
  spot: ParkingSpace;
  // FIX: Update prop to accept a Promise, resolving the type mismatch from App.tsx.
  onRequestMarkAvailable: (spotId: number, startDate: Date, endDate: Date) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 22, 61, 0.6)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#23213D',
    padding: '24px',
    borderRadius: '16px',
    width: '400px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
};

const labelStyle: React.CSSProperties = {
    fontWeight: 500
};

const inputStyle: React.CSSProperties = {
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif"
};

const primaryButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'white',
    color: '#5A48E5',
    fontWeight: 500,
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
    marginRight: '10px'
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    border: '1px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'white',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif"
};

const MarkAvailableModal: React.FC<MarkAvailableModalProps> = ({ spot, onRequestMarkAvailable, onClose }) => {
  const [startDate, setStartDate] = useState(toYYYYMMDD(getToday()));
  const [endDate, setEndDate] = useState(toYYYYMMDD(getTomorrow()));
  const [error, setError] = useState('');

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    if (newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  };

  // FIX: Make handler async and await the promise from onRequestMarkAvailable.
  const handleMarkAvailable = async () => {
    const start = parseYYYYMMDD(startDate);
    const end = parseYYYYMMDD(endDate);
    if (start > end) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError('');
    const result = await onRequestMarkAvailable(spot.id, start, end);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{marginTop: 0, fontWeight: 700}}>Mark Spot #{spot.id} as Available</h2>
        <div style={inputGroupStyle}>
            <label htmlFor="start-date" style={labelStyle}>Start Date</label>
            <input 
                type="date" 
                id="start-date" 
                value={startDate} 
                onChange={handleStartDateChange}
                min={toYYYYMMDD(getToday())}
                style={inputStyle}
            />
        </div>
        <div style={inputGroupStyle}>
            <label htmlFor="end-date" style={labelStyle}>End Date</label>
            <input 
                type="date" 
                id="end-date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                style={inputStyle}
            />
        </div>
        {error && <p style={{ color: '#FFB8B8', margin: 0 }}>{error}</p>}
        <div>
          <button onClick={handleMarkAvailable} style={primaryButtonStyle}>Confirm</button>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MarkAvailableModal;
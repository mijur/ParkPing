import React, { useState } from 'react';
import type { ParkingSpace, Availability } from '../types';
import { MOCK_USERS } from '../constants';
import { toYYYYMMDD, getToday, getTomorrow, parseYYYYMMDD } from '../utils/dateUtils';

interface OwnerViewProps {
  spot: ParkingSpace;
  availabilities: Availability[];
  onRequestMarkAvailable: (startDate: Date, endDate: Date) => { success: boolean; message: string };
  onUndoAvailability: (availabilityId: string) => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '40px',
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  padding: '40px',
  borderRadius: '24px',
  maxWidth: '900px',
  margin: '40px auto',
  alignItems: 'flex-start',
};

const leftPanelStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
};

const rightPanelStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
};

const spotNumberStyle: React.CSSProperties = {
  fontSize: '96px',
  fontWeight: 700,
  margin: '0 0 24px 0',
  lineHeight: 1,
  color: 'rgba(255, 255, 255, 0.9)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  backgroundColor: 'white',
  color: '#5A48E5',
  fontWeight: 700,
  fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
  fontSize: '16px',
  width: '100%',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const listItemStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
};

const undoButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #FFB8B8',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#FFB8B8',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
    fontSize: '12px',
    fontWeight: 500,
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
};

const labelStyle: React.CSSProperties = {
    fontWeight: 500,
    textAlign: 'left',
};

const inputStyle: React.CSSProperties = {
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    fontFamily: "'Poppins', 'Source Serif Pro', sans-serif"
};


const OwnerView: React.FC<OwnerViewProps> = ({
  spot,
  availabilities,
  onRequestMarkAvailable,
  onUndoAvailability,
}) => {
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

  const handleConfirmAvailability = () => {
    const start = parseYYYYMMDD(startDate);
    const end = parseYYYYMMDD(endDate);
    
    if (start > end) {
      setError('Start date cannot be after end date.');
      return;
    }

    const result = onRequestMarkAvailable(start, end);

    if (result.success) {
      setError('');
    } else {
      setError(result.message);
    }
  };

  const dynamicListStyle: React.CSSProperties = { ...listStyle };
  if (availabilities.length > 3) {
    dynamicListStyle.maxHeight = '260px';
    dynamicListStyle.overflowY = 'auto';
    dynamicListStyle.paddingRight = '10px';
  }


  return (
    <div style={containerStyle}>
      <div style={leftPanelStyle}>
        <p style={{ margin: 0, fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)' }}>Your Parking Spot</p>
        <h1 style={spotNumberStyle}>#{spot.id}</h1>
        <div style={{ width: '100%' }}>
          <h3 style={{ fontWeight: 700, textAlign: 'left', marginBottom: '16px' }}>Upcoming Availability</h3>
          {availabilities.length > 0 ? (
            <ul style={dynamicListStyle}>
              {availabilities.slice().sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).map(avail => {
                const claimedByUser = MOCK_USERS.find(u => u.id === avail.claimedById);
                return (
                  <li key={avail.id} style={{...listItemStyle, marginRight: availabilities.length > 3 ? '-10px' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{toYYYYMMDD(avail.startDate)} to {toYYYYMMDD(avail.endDate)}</span>
                      {claimedByUser ? (
                          <span style={{ fontSize: '12px', color: '#C8FFD4', marginTop: '4px' }}>Claimed by {claimedByUser.name}</span>
                      ) : (
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Available</span>
                      )}
                    </div>
                    {!claimedByUser && (
                      <button onClick={() => onUndoAvailability(avail.id)} style={undoButtonStyle}>Undo</button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              Your spot is not currently marked as available.
            </p>
          )}
        </div>
      </div>
      <div style={rightPanelStyle}>
        <h3 style={{marginTop: 0, fontWeight: 700, textAlign: 'left'}}>Add New Availability</h3>
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
        {error && <p style={{ color: '#FFB8B8', margin: 0, textAlign: 'left' }}>{error}</p>}
        <button style={{ ...primaryButtonStyle, marginTop: '10px' }} onClick={handleConfirmAvailability}>
          Confirm Availability
        </button>
      </div>
    </div>
  );
};

export default OwnerView;
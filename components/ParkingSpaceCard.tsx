
import React from 'react';
import type { User, ParkingSpace, Availability } from '../types';
import { getToday, getTomorrow, toYYYYMMDD } from '../utils/dateUtils';
import { MOCK_USERS } from '../constants';

interface ParkingSpaceCardProps {
  space: ParkingSpace;
  owner?: User;
  availabilities: Availability[];
  currentUser: User;
  isAdmin: boolean;
  canClaimSpot: boolean;
  weekOffset: number; // 0 for current week, 1 for next week
  onAssign: (space: ParkingSpace) => void;
  onUnassign: (spotId: number) => void;
  onMarkAvailable: (space: ParkingSpace) => void;
  onClaimDay: (availabilityId: string, date: Date) => void;
  onUnclaim: (availabilityId: string) => void;
  onDelete: (spotId: number) => void;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  borderRadius: '16px',
  padding: '24px',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const backgroundNumberStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: '24px',
    transform: 'translateY(-50%)',
    fontSize: '120px',
    fontWeight: 700,
    color: 'rgba(0, 0, 0, 0.2)',
    lineHeight: 1,
    zIndex: 0,
    userSelect: 'none',
};

const contentWrapperStyle: React.CSSProperties = {
    zIndex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    height: '100%',
};


const buttonBaseStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500,
  fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
  fontSize: '14px',
  textAlign: 'center'
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'white',
    color: '#5A48E5',
};

const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'transparent',
    color: 'white',
    border: '1px solid white'
};

const destructiveButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'transparent',
    color: '#FFB8B8',
    border: '1px solid #FFB8B8'
};

const weekContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
};

const dayCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 4px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  flex: 1,
  textAlign: 'center',
  transition: 'background-color 0.3s',
};

const availableDayStyle: React.CSSProperties = {
  backgroundColor: '#3D9961',
  color: 'white',
};

const claimedDayStyle: React.CSSProperties = {
  backgroundColor: '#E5C55A',
  color: '#333',
};

const todayHighlightStyle: React.CSSProperties = {
  border: '1px solid white',
  padding: '7px 3px',
};

const dayNameStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  opacity: 0.7,
};

const dayNumberStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
};


const ParkingSpaceCard: React.FC<ParkingSpaceCardProps> = ({
  space,
  owner,
  availabilities,
  currentUser,
  isAdmin,
  canClaimSpot,
  weekOffset,
  onAssign,
  onUnassign,
  onMarkAvailable,
  onClaimDay,
  onUnclaim,
  onDelete,
}) => {
  const isOwner = owner?.id === currentUser.id;
  const today = getToday();
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7)); // Sunday as start, add offset

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const claimedByCurrentUserAvailability = availabilities.find(a => a.claimedById === currentUser.id);

  return (
    <div style={cardStyle}>
      <div style={backgroundNumberStyle}>{space.id}</div>
      <div style={contentWrapperStyle}>
        <p style={{margin: 0, fontWeight: 700, fontSize: '22px', color: 'rgba(255, 255, 255, 0.9)'}}>Owner: {owner ? owner.name : 'Unassigned'}</p>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {owner ? (
              <button style={destructiveButtonStyle} onClick={() => onUnassign(space.id)}>Unassign</button>
            ) : (
              <>
                <button style={primaryButtonStyle} onClick={() => onAssign(space)}>Assign Owner</button>
                <button style={destructiveButtonStyle} onClick={() => onDelete(space.id)}>Delete</button>
              </>
            )}
          </div>
        )}

        <h4 style={{margin: '24px 0 16px 0', fontWeight: 700}}>This Week's Availability</h4>
        <div style={weekContainerStyle}>
            {weekDays.map(day => {
                const availabilityOnThisDay = availabilities.find(a => 
                    day.getTime() >= a.startDate.getTime() &&
                    day.getTime() <= a.endDate.getTime()
                );

                const isClaimed = !!(availabilityOnThisDay && availabilityOnThisDay.claimedById);
                const isAvailable = !!(availabilityOnThisDay && !availabilityOnThisDay.claimedById);
                const isToday = day.getTime() === today.getTime();
                const isClickable = isAvailable && canClaimSpot;

                const dayStyle: React.CSSProperties = {
                  ...dayCellStyle,
                  ...(isClaimed && claimedDayStyle),
                  ...(isAvailable && availableDayStyle),
                  ...(isToday && todayHighlightStyle),
                  ...(isClickable && { cursor: 'pointer' }),
                };

                return (
                    <div 
                      key={day.toISOString()} 
                      style={dayStyle}
                      onClick={isClickable && availabilityOnThisDay ? () => onClaimDay(availabilityOnThisDay.id, day) : undefined}
                    >
                        <div style={dayNameStyle}>{day.toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                        <div style={dayNumberStyle}>{day.getDate()}</div>
                    </div>
                );
            })}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          {isOwner && (
            <button style={{ ...primaryButtonStyle, backgroundColor: 'rgba(255,255,255,0.9)', width: '100%' }} onClick={() => onMarkAvailable(space)}>
              Manage Availability
            </button>
          )}
          {claimedByCurrentUserAvailability && (
              <button 
                  style={{...destructiveButtonStyle, width: '100%'}} 
                  onClick={() => onUnclaim(claimedByCurrentUserAvailability.id)}
              >
                  Undo Claim
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingSpaceCard;
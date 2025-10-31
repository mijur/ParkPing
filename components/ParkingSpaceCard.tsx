import React from 'react';
import type { User, ParkingSpace, Availability } from '../types';
import { toYYYYMMDD } from '../utils/dateUtils';
import { MOCK_USERS } from '../constants';

interface ParkingSpaceCardProps {
  space: ParkingSpace;
  owner?: User;
  availabilities: Availability[];
  currentUser: User;
  isAdmin: boolean;
  canClaimSpot: boolean;
  onAssign: (space: ParkingSpace) => void;
  onUnassign: (spotId: number) => void;
  onMarkAvailable: (space: ParkingSpace) => void;
  onClaim: (availabilityId: string) => void;
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


const ParkingSpaceCard: React.FC<ParkingSpaceCardProps> = ({
  space,
  owner,
  availabilities,
  currentUser,
  isAdmin,
  canClaimSpot,
  onAssign,
  onUnassign,
  onMarkAvailable,
  onClaim,
  onUnclaim,
  onDelete,
}) => {
  const isOwner = owner?.id === currentUser.id;

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

        <h4 style={{margin: '24px 0 0 0', fontWeight: 700}}>Availability</h4>
        {availabilities.length > 0 ? (
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {availabilities.map(avail => (
              <li key={avail.id}>
                {toYYYYMMDD(avail.startDate)} to {toYYYYMMDD(avail.endDate)}
                <br />
                {avail.claimedById ? (
                  <div style={{ color: '#C8FFD4', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Claimed by {MOCK_USERS.find(u => u.id === avail.claimedById)?.name || 'another user'}
                    {avail.claimedById === currentUser.id && (
                       <button style={{...secondaryButtonStyle, padding: '6px 10px', fontSize: '12px'}} onClick={() => onUnclaim(avail.id)}>Unclaim</button>
                    )}
                  </div>
                ) : (
                  canClaimSpot && <button style={{...secondaryButtonStyle, marginTop: '8px'}} onClick={() => onClaim(avail.id)}>Claim</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{margin: 0, color: 'rgba(255, 255, 255, 0.7)'}}>No availability set.</p>
        )}
        
        {isOwner && (
          <button style={{ ...primaryButtonStyle, marginTop: 'auto', backgroundColor: 'rgba(255,255,255,0.9)' }} onClick={() => onMarkAvailable(space)}>
            Mark as Available
          </button>
        )}
      </div>
    </div>
  );
};

export default ParkingSpaceCard;
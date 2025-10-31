import React, { useState } from 'react';
import type { User, ParkingSpace } from '../../types';

interface AssignOwnerModalProps {
  spot: ParkingSpace;
  users: User[];
  onAssign: (spotId: number, ownerId: string) => void;
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
    width: '320px',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const selectStyle: React.CSSProperties = {
    width: '100%', 
    padding: '10px', 
    marginBottom: '20px',
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


const AssignOwnerModal: React.FC<AssignOwnerModalProps> = ({ spot, users, onAssign, onClose }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users.length > 0 ? users[0].id : '');

  const handleAssign = () => {
    if (selectedUserId) {
      onAssign(spot.id, selectedUserId);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{marginTop: 0, fontWeight: 700}}>Assign Owner to Spot #{spot.id}</h2>
        {users.length > 0 ? (
          <>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={selectStyle}>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button onClick={handleAssign} style={primaryButtonStyle}>Assign</button>
          </>
        ) : (
          <p>No users available to assign.</p>
        )}
        <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
      </div>
    </div>
  );
};

export default AssignOwnerModal;
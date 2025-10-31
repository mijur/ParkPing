import React from 'react';
import type { User } from '../types';

interface UserSwitcherProps {
  users: User[];
  currentUser: User;
  onUserChange: (user: User) => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ users, currentUser, onUserChange }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUser = users.find(u => u.id === event.target.value);
    if (selectedUser) {
      onUserChange(selectedUser);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <label htmlFor="user-switcher" style={{ marginRight: '10px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>Current User: </label>
      <select id="user-switcher" value={currentUser.id} onChange={handleChange} style={{ 
        padding: '8px 12px', 
        borderRadius: '8px', 
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        fontFamily: "'Poppins', 'Source Serif Pro', sans-serif"
      }}>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default UserSwitcher;
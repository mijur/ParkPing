
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
    <div className="p-4 bg-white rounded-lg shadow-md flex items-center gap-4">
      <label htmlFor="user-switcher" className="text-sm font-medium text-gray-700">
        Viewing as:
      </label>
      <select
        id="user-switcher"
        value={currentUser.id}
        onChange={handleChange}
        className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
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

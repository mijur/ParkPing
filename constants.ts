
import type { User } from './types';
import { Role } from './types';

export const TOTAL_SPOTS = 100;

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Alice (Admin)', role: Role.Admin },
  { id: 'user-2', name: 'Bob', role: Role.User },
  { id: 'user-3', name: 'Charlie', role: Role.User },
  { id: 'user-4', name: 'Diana', role: Role.User },
  { id: 'user-5', name: 'Eve (No Spot)', role: Role.User },
  { id: 'user-6', name: 'Frank (No Spot)', role: Role.User },
];

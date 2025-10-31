import type { Timestamp } from 'firebase/firestore';

export enum Role {
  Admin = 'admin',
  User = 'user',
}

export interface User {
  id: string; // Firebase Auth UID
  name: string;
  role: Role;
}

export interface ParkingSpace {
  id: number;
  ownerId: string | null;
}

// Data structure as it is stored in Firestore
export interface AvailabilityFirestore {
  spotId: number;
  startDate: Timestamp;
  endDate: Timestamp;
  claimedById: string | null;
}

// Data structure used within the React application
export interface Availability extends Omit<AvailabilityFirestore, 'startDate' | 'endDate'> {
  id: string; // Firestore document ID
  startDate: Date;
  endDate: Date;
}

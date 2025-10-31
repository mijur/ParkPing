export enum Role {
  Admin = 'admin',
  User = 'user',
}

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface ParkingSpace {
  id: number;
  ownerId: string | null;
}

export interface Availability {
  id: string;
  spotId: number;
  startDate: Date;
  endDate: Date;
  claimedById: string | null;
}

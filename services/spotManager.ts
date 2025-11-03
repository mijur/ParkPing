import type { ParkingSpace, User, Availability } from '../types';
import { Role } from '../types';
import * as dbService from './database';

/**
 * Manages parking space operations and calculations
 */
export class SpotManager {
  /**
   * Get the spot owned by a user
   */
  static getOwnedSpot(
    userId: string,
    parkingSpaces: ParkingSpace[]
  ): ParkingSpace | undefined {
    return parkingSpaces.find(p => p.ownerId === userId);
  }

  /**
   * Check if a user owns a spot
   */
  static hasOwnedSpot(userId: string, parkingSpaces: ParkingSpace[]): boolean {
    return !!this.getOwnedSpot(userId, parkingSpaces);
  }

  /**
   * Get users without assigned spots
   */
  static getUsersWithoutSpots(
    users: User[],
    parkingSpaces: ParkingSpace[]
  ): User[] {
    return users.filter(
      u => !parkingSpaces.some(p => p.ownerId === u.id) && u.role === Role.User
    );
  }

  /**
   * Get availabilities for a specific spot
   */
  static getSpotAvailabilities(
    spotId: number,
    availabilities: Availability[]
  ): Availability[] {
    return availabilities.filter(a => a.spotId === spotId);
  }

  /**
   * Create a new parking space
   */
  static async createParkingSpace(): Promise<ParkingSpace> {
    return dbService.createParkingSpace();
  }

  /**
   * Update parking space (owner assignment, etc.)
   */
  static async updateParkingSpace(
    spotId: number,
    updates: Partial<ParkingSpace>
  ): Promise<void> {
    await dbService.updateParkingSpace(spotId, updates);
  }

  /**
   * Delete a parking space
   */
  static async deleteParkingSpace(spotId: number): Promise<void> {
    await dbService.deleteParkingSpace(spotId);
  }

  /**
   * Check if a user can claim a spot (no owned or claimed spots)
   */
  static canClaimSpot(
    userId: string,
    parkingSpaces: ParkingSpace[],
    claimedAvailability: Availability | undefined
  ): boolean {
    const ownedSpot = this.getOwnedSpot(userId, parkingSpaces);
    return !ownedSpot && !claimedAvailability;
  }

  /**
   * Get available spots for a user in a given week
   */
  static getAvailableSpotsForWeek(
    startDate: Date,
    endDate: Date,
    parkingSpaces: ParkingSpace[],
    availabilities: Availability[]
  ): ParkingSpace[] {
    return parkingSpaces.filter(space =>
      availabilities.some(a =>
        a.spotId === space.id &&
        !a.claimedById &&
        a.startDate.getTime() <= endDate.getTime() &&
        a.endDate.getTime() >= startDate.getTime()
      )
    );
  }

  /**
   * Get owner user object for a spot
   */
  static getSpotOwner(
    spot: ParkingSpace,
    users: User[]
  ): User | undefined {
    return users.find(u => u.id === spot.ownerId);
  }
}

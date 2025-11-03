import type { Availability } from '../types';
import { normalizeDate, addDays } from '../utils/dateUtils';
import * as dbService from './database';

/**
 * Manages availability-related operations and calculations
 */
export class AvailabilityManager {
  /**
   * Sort availabilities by start date, spot ID, end date, and ID
   */
  static sortAvailabilities(entries: Availability[]): Availability[] {
    return [...entries].sort((a, b) => {
      const startDiff = a.startDate.getTime() - b.startDate.getTime();
      if (startDiff !== 0) return startDiff;
      if (a.spotId !== b.spotId) return a.spotId - b.spotId;
      const endDiff = a.endDate.getTime() - b.endDate.getTime();
      if (endDiff !== 0) return endDiff;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Check if an availability window overlaps with existing ones
   */
  static findOverlappingAvailability(
    spotId: number,
    startDate: Date,
    endDate: Date,
    availabilities: Availability[]
  ): Availability | undefined {
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);

    return availabilities.find(avail =>
      avail.spotId === spotId &&
      normalizedStart.getTime() <= avail.endDate.getTime() &&
      normalizedEnd.getTime() >= avail.startDate.getTime()
    );
  }

  /**
   * Create a new availability window
   */
  static async createAvailability(
    spotId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Availability> {
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);
    return dbService.createAvailability(spotId, normalizedStart, normalizedEnd);
  }

  /**
   * Mark an availability as claimed
   */
  static async claimAvailability(
    availabilityId: string,
    claimedById: string
  ): Promise<void> {
    await dbService.updateAvailability(availabilityId, { claimedById });
  }

  /**
   * Unclaim an availability
   */
  static async unclaimAvailability(availabilityId: string): Promise<void> {
    await dbService.updateAvailability(availabilityId, { claimedById: null });
  }

  /**
   * Delete an availability
   */
  static async deleteAvailability(availabilityId: string): Promise<void> {
    await dbService.deleteAvailability(availabilityId);
  }

  /**
   * Handle claiming a single day from an availability window
   * Splits the availability into claimed day and remaining segments
   */
  static async handleClaimDay(
    availabilityId: string,
    dayToClaim: Date,
    claimedById: string,
    availabilities: Availability[]
  ): Promise<void> {
    const normalizedDay = normalizeDate(dayToClaim);
    const target = availabilities.find(entry => entry.id === availabilityId);

    if (!target || target.claimedById) {
      throw new Error('Availability cannot be claimed');
    }

    const start = normalizeDate(target.startDate);
    const end = normalizeDate(target.endDate);

    if (normalizedDay.getTime() < start.getTime() || normalizedDay.getTime() > end.getTime()) {
      throw new Error('Day is not within availability window');
    }

    // Delete the original availability
    await dbService.deleteAvailability(availabilityId);

    // Create the claimed day
    const claimedAvailability = await dbService.createAvailability(
      target.spotId,
      normalizedDay,
      normalizedDay
    );
    await dbService.updateAvailability(claimedAvailability.id, { claimedById });

    // Create remaining availability before the claimed day
    if (normalizedDay.getTime() > start.getTime()) {
      await dbService.createAvailability(
        target.spotId,
        start,
        addDays(normalizedDay, -1)
      );
    }

    // Create remaining availability after the claimed day
    if (normalizedDay.getTime() < end.getTime()) {
      await dbService.createAvailability(
        target.spotId,
        addDays(normalizedDay, 1),
        end
      );
    }
  }

  /**
   * Get user's claimed availability
   */
  static getClaimedAvailability(
    userId: string,
    availabilities: Availability[]
  ): Availability | undefined {
    return availabilities.find(a => a.claimedById === userId);
  }

  /**
   * Check if a user has any claimed availability
   */
  static hasClaimedAvailability(
    userId: string,
    availabilities: Availability[]
  ): boolean {
    return !!this.getClaimedAvailability(userId, availabilities);
  }
}

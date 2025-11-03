import type { User, ParkingSpace, Availability } from '../types';
import { AvailabilityManager } from './availabilityManager';
import { SpotManager } from './spotManager';
import * as dbService from './database';

export interface HandlerResult {
  success: boolean;
  message: string;
}

/**
 * Handles all user-triggered operations and business logic
 */
export class OperationHandler {
  /**
   * Handle adding a new parking spot
   */
  static async handleAddSpot(isAdmin: boolean): Promise<HandlerResult> {
    if (!isAdmin) {
      return { success: false, message: 'Only admins can add parking spots' };
    }
    try {
      await SpotManager.createParkingSpace();
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to add parking spot: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle assigning an owner to a spot
   */
  static async handleAssignOwner(
    spotId: number,
    ownerId: string
  ): Promise<HandlerResult> {
    try {
      await SpotManager.updateParkingSpace(spotId, { ownerId });
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to assign owner: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle unassigning an owner from a spot
   */
  static async handleUnassignOwner(spotId: number): Promise<HandlerResult> {
    try {
      await SpotManager.updateParkingSpace(spotId, { ownerId: null });
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to unassign owner: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle deleting a parking spot
   */
  static async handleDeleteSpot(spotId: number): Promise<HandlerResult> {
    try {
      await SpotManager.deleteParkingSpace(spotId);
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete spot: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle marking availability for a spot
   */
  static async handleMarkAvailable(
    spotId: number,
    startDate: Date,
    endDate: Date,
    availabilities: Availability[]
  ): Promise<HandlerResult> {
    try {
      const overlapping = AvailabilityManager.findOverlappingAvailability(
        spotId,
        startDate,
        endDate,
        availabilities
      );

      if (overlapping && overlapping.claimedById) {
        return {
          success: false,
          message: 'This period overlaps with a claimed availability and cannot be changed.',
        };
      }

      if (overlapping) {
        // Return special case: needs confirmation
        return { success: false, message: 'NEEDS_CONFIRMATION' };
      }

      await AvailabilityManager.createAvailability(spotId, startDate, endDate);
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create availability',
      };
    }
  }

  /**
   * Handle overwriting existing availability
   */
  static async handleOverwriteAvailability(
    spotId: number,
    startDate: Date,
    endDate: Date,
    overlappingId: string
  ): Promise<HandlerResult> {
    try {
      await AvailabilityManager.deleteAvailability(overlappingId);
      await AvailabilityManager.createAvailability(spotId, startDate, endDate);
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to overwrite availability: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle claiming a single day
   */
  static async handleClaimDay(
    availabilityId: string,
    dayToClaim: Date,
    currentUser: User | null,
    availabilities: Availability[]
  ): Promise<HandlerResult> {
    if (!currentUser) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      await AvailabilityManager.handleClaimDay(
        availabilityId,
        dayToClaim,
        currentUser.id,
        availabilities
      );
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to claim day',
      };
    }
  }

  /**
   * Handle unclaiming an availability
   */
  static async handleUnclaim(availabilityId: string): Promise<HandlerResult> {
    try {
      await AvailabilityManager.unclaimAvailability(availabilityId);
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to unclaim: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle deleting an availability
   */
  static async handleDeleteAvailability(availabilityId: string): Promise<HandlerResult> {
    try {
      await AvailabilityManager.deleteAvailability(availabilityId);
      return { success: true, message: '' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete availability: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Get confirmation details for an operation
   */
  static getConfirmationDetails(
    action: 'unassign' | 'delete' | 'overwrite' | 'unclaim',
    spot?: ParkingSpace,
    owner?: User,
    availability?: Availability
  ): { title: string; message: string; confirmButtonText: string; variant: 'primary' | 'destructive' } | null {
    switch (action) {
      case 'unassign':
        if (!spot || !owner) return null;
        return {
          title: 'Confirm Unassign',
          message: `Are you sure you want to unassign ${owner.name} from Spot #${spot.id}?`,
          confirmButtonText: 'Unassign',
          variant: 'destructive',
        };

      case 'delete':
        if (!spot) return null;
        return {
          title: 'Confirm Deletion',
          message: `Are you sure you want to permanently delete Spot #${spot.id}?`,
          confirmButtonText: 'Delete Spot',
          variant: 'destructive',
        };

      case 'overwrite':
        return {
          title: 'Overwrite Availability',
          message: 'Your new availability overlaps with an existing one. Do you want to replace it?',
          confirmButtonText: 'Overwrite',
          variant: 'primary',
        };

      case 'unclaim':
        if (!availability) return null;
        return {
          title: 'Confirm Unclaim',
          message: `Are you sure you want to unclaim your spot for ${availability.startDate.toLocaleDateString()}?`,
          confirmButtonText: 'Yes, Unclaim',
          variant: 'destructive',
        };

      default:
        return null;
    }
  }
}

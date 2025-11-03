import type { ParkingSpace, Availability } from '../types';
import { getToday, addDays } from '../utils/dateUtils';

export type ViewMode = 'default' | 'all';

interface ViewConfig {
  title: string;
  buttonText: string;
}

/**
 * Manages view logic and filtering for parking spaces display
 */
export class ViewManager {
  /**
   * Get the start and end dates for a given week offset
   */
  static getWeekBounds(weekOffset: number): { start: Date; end: Date } {
    const today = getToday();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return { start: startOfWeek, end: endOfWeek };
  }

  /**
   * Get title for a given week offset
   */
  static getWeekTitle(weekOffset: number): string {
    return weekOffset === 0 ? 'This Week' : 'Next Week';
  }

  /**
   * Filter spaces by availability in a week
   */
  static filterAvailableSpotsInWeek(
    parkingSpaces: ParkingSpace[],
    availabilities: Availability[],
    weekStart: Date,
    weekEnd: Date
  ): ParkingSpace[] {
    return parkingSpaces.filter(space =>
      availabilities.some(a =>
        a.spotId === space.id &&
        !a.claimedById &&
        a.startDate.getTime() <= weekEnd.getTime() &&
        a.endDate.getTime() >= weekStart.getTime()
      )
    );
  }

  /**
   * Get view configuration for admin with owned spot
   */
  static getAdminWithSpotConfig(viewMode: ViewMode): ViewConfig {
    return viewMode === 'default'
      ? { title: 'Owned Spots', buttonText: 'Show All Spots' }
      : { title: 'All Spots', buttonText: 'Show Owned Only' };
  }

  /**
   * Get view configuration for admin without owned spot (claiming mode)
   */
  static getAdminClaimingConfig(viewMode: ViewMode, weekOffset: number): ViewConfig {
    const weekTitle = this.getWeekTitle(weekOffset);
    return viewMode === 'default'
      ? { title: `Available ${weekTitle}`, buttonText: 'Show All Spots' }
      : { title: 'All Spots', buttonText: 'Show Available Spots' };
  }

  /**
   * Get view configuration for regular user
   */
  static getUserConfig(
    viewMode: ViewMode,
    weekOffset: number,
    hasClaimedAvailability: boolean
  ): ViewConfig {
    const weekTitle = this.getWeekTitle(weekOffset);
    const defaultTitle = `Available ${weekTitle}`;
    const allTitle = 'All Spots';
    const buttonText = hasClaimedAvailability
      ? 'Show Available Spots'
      : 'Show Available This Week';

    return viewMode === 'default'
      ? { title: defaultTitle, buttonText }
      : { title: allTitle, buttonText };
  }

  /**
   * Get empty state message based on view and user type
   */
  static getEmptyStateMessage(
    isAdmin: boolean,
    viewMode: ViewMode,
    weekOffset: number,
    hasOwnedSpot: boolean,
    hasClaimedAvailability: boolean
  ): string {
    if (isAdmin) {
      // Admin claiming mode
      if (viewMode === 'default' && !hasOwnedSpot) {
        const weekText = this.getWeekTitle(weekOffset).toLowerCase();
        return `No parking spots are available ${weekText.toLowerCase()}. Please check back later.`;
      }
      return viewMode === 'default'
        ? 'No spots are currently assigned to users.'
        : 'There are no spots in the system. Add one!';
    }

    // Regular user
    const weekText = this.getWeekTitle(weekOffset).toLowerCase();
    return viewMode === 'default'
      ? `No parking spots are available ${weekText}. Please check back later.`
      : 'There are no spots in the system.';
  }

  /**
   * Determine if week navigation should be shown
   */
  static shouldShowWeekNavigation(
    isAdmin: boolean,
    viewMode: ViewMode,
    hasOwnedSpot: boolean,
    canClaimSpot: boolean
  ): boolean {
    if (isAdmin) {
      return viewMode === 'default' && !hasOwnedSpot && canClaimSpot;
    }
    return viewMode === 'default' && !hasOwnedSpot && canClaimSpot;
  }

  /**
   * Get filtered display spaces based on view mode and user type
   */
  static getDisplayedSpaces(
    viewMode: ViewMode,
    isAdmin: boolean,
    parkingSpaces: ParkingSpace[],
    availabilities: Availability[],
    hasOwnedSpot: boolean,
    claimedAvailability: Availability | undefined,
    canClaimSpot: boolean,
    weekOffset: number
  ): ParkingSpace[] {
    const { start: weekStart, end: weekEnd } = this.getWeekBounds(weekOffset);

    if (isAdmin) {
      // Admin without owned spot - show available for claiming
      if (viewMode === 'default' && !hasOwnedSpot && canClaimSpot) {
        const availableThisWeek = this.filterAvailableSpotsInWeek(
          parkingSpaces,
          availabilities,
          weekStart,
          weekEnd
        );

        if (claimedAvailability) {
          const claimedSpot = parkingSpaces.find(
            space => space.id === claimedAvailability.spotId
          );

          let combinedList = [...availableThisWeek];
          if (claimedSpot && !combinedList.some(s => s.id === claimedSpot.id)) {
            combinedList.push(claimedSpot);
          }

          combinedList.sort((a, b) => {
            if (a.id === claimedAvailability.spotId) return -1;
            if (b.id === claimedAvailability.spotId) return 1;
            return a.id - b.id;
          });

          return combinedList;
        }
        return availableThisWeek;
      }

      // Admin with owned spot - show owned or all
      return viewMode === 'default'
        ? parkingSpaces.filter(p => p.ownerId)
        : parkingSpaces;
    }

    // Regular user
    if (viewMode === 'default' && !hasOwnedSpot) {
      const availableThisWeek = this.filterAvailableSpotsInWeek(
        parkingSpaces,
        availabilities,
        weekStart,
        weekEnd
      );

      if (claimedAvailability) {
        const claimedSpot = parkingSpaces.find(
          space => space.id === claimedAvailability.spotId
        );

        let combinedList = [...availableThisWeek];
        if (claimedSpot && !combinedList.some(s => s.id === claimedSpot.id)) {
          combinedList.push(claimedSpot);
        }

        combinedList.sort((a, b) => {
          if (a.id === claimedAvailability.spotId) return -1;
          if (b.id === claimedAvailability.spotId) return 1;
          return a.id - b.id;
        });

        return combinedList;
      }
      return availableThisWeek;
    }

    return parkingSpaces;
  }
}

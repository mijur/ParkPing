import { supabase } from '../lib/supabase';
import type { User, ParkingSpace, Availability } from '../types';
import { Role } from '../types';

// Database types
interface DbUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
  created_at?: string;
  updated_at?: string;
}

interface DbParkingSpace {
  id: number;
  owner_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DbAvailability {
  id: string;
  spot_id: number;
  start_date: string;
  end_date: string;
  claimed_by_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// Convert database types to app types
const dbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  name: dbUser.name,
  role: dbUser.role === 'admin' ? Role.Admin : Role.User,
});

const dbParkingSpaceToParkingSpace = (dbSpace: DbParkingSpace): ParkingSpace => ({
  id: dbSpace.id,
  ownerId: dbSpace.owner_id,
});

const dbAvailabilityToAvailability = (dbAvail: DbAvailability): Availability => ({
  id: dbAvail.id,
  spotId: dbAvail.spot_id,
  startDate: new Date(dbAvail.start_date),
  endDate: new Date(dbAvail.end_date),
  claimedById: dbAvail.claimed_by_id,
});

// User operations
export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []).map(dbUserToUser);
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({
      name: updates.name,
      role: updates.role === Role.Admin ? 'admin' : 'user',
    })
    .eq('id', userId);

  if (error) throw error;
};

// Parking space operations
export const fetchParkingSpaces = async (): Promise<ParkingSpace[]> => {
  const { data, error } = await supabase
    .from('parking_spaces')
    .select('*')
    .order('id');

  if (error) throw error;
  return (data || []).map(dbParkingSpaceToParkingSpace);
};

export const createParkingSpace = async (): Promise<ParkingSpace> => {
  const { data, error } = await supabase
    .from('parking_spaces')
    .insert({})
    .select()
    .single();

  if (error) throw error;
  return dbParkingSpaceToParkingSpace(data);
};

export const updateParkingSpace = async (
  spotId: number,
  updates: Partial<ParkingSpace>
): Promise<void> => {
  const { error } = await supabase
    .from('parking_spaces')
    .update({
      owner_id: updates.ownerId ?? null,
    })
    .eq('id', spotId);

  if (error) throw error;
};

export const deleteParkingSpace = async (spotId: number): Promise<void> => {
  const { error } = await supabase
    .from('parking_spaces')
    .delete()
    .eq('id', spotId);

  if (error) throw error;
};

// Availability operations
export const fetchAvailabilities = async (): Promise<Availability[]> => {
  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .order('start_date')
    .order('spot_id')
    .order('end_date');

  if (error) throw error;
  return (data || []).map(dbAvailabilityToAvailability);
};

export const createAvailability = async (
  spotId: number,
  startDate: Date,
  endDate: Date
): Promise<Availability> => {
  const { data, error } = await supabase
    .from('availabilities')
    .insert({
      spot_id: spotId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      claimed_by_id: null,
    })
    .select()
    .single();

  if (error) throw error;
  return dbAvailabilityToAvailability(data);
};

export const updateAvailability = async (
  availabilityId: string,
  updates: Partial<Availability>
): Promise<void> => {
  const updateData: any = {};
  
  if (updates.startDate !== undefined) {
    updateData.start_date = updates.startDate.toISOString().split('T')[0];
  }
  if (updates.endDate !== undefined) {
    updateData.end_date = updates.endDate.toISOString().split('T')[0];
  }
  if (updates.claimedById !== undefined) {
    updateData.claimed_by_id = updates.claimedById;
  }

  const { error } = await supabase
    .from('availabilities')
    .update(updateData)
    .eq('id', availabilityId);

  if (error) throw error;
};

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
  const { error } = await supabase
    .from('availabilities')
    .delete()
    .eq('id', availabilityId);

  if (error) throw error;
};

// Real-time subscriptions
export const subscribeToParkingSpaces = (
  callback: (spaces: ParkingSpace[]) => void
) => {
  const channel = supabase
    .channel('parking_spaces_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parking_spaces' },
      async () => {
        const spaces = await fetchParkingSpaces();
        callback(spaces);
      }
    )
    .subscribe();
  
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
};

export const subscribeToAvailabilities = (
  callback: (availabilities: Availability[]) => void
) => {
  const channel = supabase
    .channel('availabilities_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'availabilities' },
      async () => {
        const availabilities = await fetchAvailabilities();
        callback(availabilities);
      }
    )
    .subscribe();
  
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
};


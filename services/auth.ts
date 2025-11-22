import supabase from '../utils/supabase'
import type { User } from '../types';
import { Role } from '../types';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Authentication operations
export const signUp = async (data: SignUpData): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (authError) {
      return { success: false, message: authError.message };
    }

    if (!authData.user) {
      return { success: false, message: 'Failed to create user' };
    }

    // Fetch the created user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return { success: false, message: userError.message };
    }

    return {
      success: true,
      message: '',
      user: {
        id: userData.id,
        name: userData.name,
        role: userData.role === 'admin' ? Role.Admin : Role.User,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'An error occurred during sign up' };
  }
};

export const signIn = async (data: SignInData): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return { success: false, message: authError.message };
    }

    if (!authData.user) {
      return { success: false, message: 'Failed to sign in' };
    }

    // Fetch the user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return { success: false, message: userError.message };
    }

    return {
      success: true,
      message: '',
      user: {
        id: userData.id,
        name: userData.name,
        role: userData.role === 'admin' ? Role.Admin : Role.User,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'An error occurred during sign in' };
  }
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !userData) {
    return null;
  }

  return {
    id: userData.id,
    name: userData.name,
    role: userData.role === 'admin' ? Role.Admin : Role.User,
  };
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
};


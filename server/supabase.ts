import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://xevnhgizberlburnxuzh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not found - some backend features may not work');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Function to create user profile in Supabase database
export async function createUserProfileInSupabase(userData: {
  email: string;
  name: string;
  role: string;
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          full_name: userData.name,
          role: userData.role,
          username: userData.email.split('@')[0], // Use email prefix as username
          password_hash: 'supabase-auth', // Placeholder since Supabase Auth handles this
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile in Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// Function to get user profile from Supabase
export async function getUserProfileFromSupabase(email: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error getting user profile from Supabase:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
} 
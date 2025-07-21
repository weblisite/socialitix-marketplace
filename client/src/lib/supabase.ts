import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xevnhgizberlburnxuzh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhldm5oZ2l6YmVybGJ1cm54dXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDY3NzQsImV4cCI6MjA2ODUyMjc3NH0.GjjC9I-__p0e4nez0Dar71p2zMFjd2sX2K2K_xBYRl4'

// Log environment variables for debugging (remove in production)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to create user profile in our database
export async function createUserProfile(userData: {
  email: string;
  name: string;
  role: string;
}) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          email: string
          password: string
          name: string
          role: string
          balance: string
          social_media_accounts: any
          created_at: string
        }
        Insert: {
          id?: number
          email: string
          password: string
          name: string
          role: string
          balance?: string
          social_media_accounts?: any
          created_at?: string
        }
        Update: {
          id?: number
          email?: string
          password?: string
          name?: string
          role?: string
          balance?: string
          social_media_accounts?: any
          created_at?: string
        }
      }
      services: {
        Row: {
          id: number
          provider_id: number
          title: string
          description: string | null
          platform: string
          type: string
          price: string
          currency: string
          delivery_time: number
          min_order: number
          max_order: number | null
          rating: string
          total_orders: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          provider_id: number
          title: string
          description?: string | null
          platform: string
          type: string
          price: string
          currency?: string
          delivery_time: number
          min_order?: number
          max_order?: number | null
          rating?: string
          total_orders?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          provider_id?: number
          title?: string
          description?: string | null
          platform?: string
          type?: string
          price?: string
          currency?: string
          delivery_time?: number
          min_order?: number
          max_order?: number | null
          rating?: string
          total_orders?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: number
          buyer_id: number
          provider_id: number
          service_id: number
          amount: string
          currency: string
          status: string
          payment_method: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          buyer_id: number
          provider_id: number
          service_id: number
          amount: string
          currency?: string
          status?: string
          payment_method?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          buyer_id?: number
          provider_id?: number
          service_id?: number
          amount?: string
          currency?: string
          status?: string
          payment_method?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 
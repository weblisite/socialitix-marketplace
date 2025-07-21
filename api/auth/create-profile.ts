import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { user_id, full_name, email, role } = req.body;

    if (!user_id || !full_name || !email || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: user_id,
          full_name,
          email,
          role,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return res.status(500).json({ message: 'Failed to create profile', error: error.message });
    }

    return res.status(201).json({ message: 'Profile created successfully', user: data });
  } catch (error) {
    console.error('Error in create-profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 
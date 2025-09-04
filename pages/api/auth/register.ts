import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { serialize } from 'cookie';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate userId
    const userId = crypto.randomUUID();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    // Insert into Supabase
    const { error } = await supabase.from('users').insert([
      {
        id: userId,
        email,
        trial_end: trialEnd.toISOString(),
        subscription_status: 'trialing',
        plan_type: 'trial',
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Create session cookie
    const cookie = serialize(process.env.COOKIE_NAME!, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ success: true, trialEnds: trialEnd });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// app/api/check-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkUserAccess } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    console.log(`Checking access for: ${email}`);
    
    const hasAccess = await checkUserAccess(email);
    
    console.log(`Access check result for ${email}: ${hasAccess}`);
    
    return NextResponse.json({ 
      hasAccess,
      email 
    });
  } catch (error: any) {
    console.error('Access check error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      hasAccess: false 
    }, { status: 500 });
  }
}
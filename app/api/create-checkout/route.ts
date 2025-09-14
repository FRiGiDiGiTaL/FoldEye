// app/api/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '../../../lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { email, successUrl, cancelUrl } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Success and cancel URLs required' }, { status: 400 });
    }

    const session = await createCheckoutSession({
      customerEmail: email,
      successUrl,
      cancelUrl
    });

    if (!session) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
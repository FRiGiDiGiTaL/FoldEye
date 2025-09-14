// ... existing code
    if (!successUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Success and cancel URLs required' }, { status: 400 });
    }

    const session = await createCheckoutSession({
      customerId: email,
      successUrl,
      cancelUrl
    });

    if (!session) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
// ... existing code
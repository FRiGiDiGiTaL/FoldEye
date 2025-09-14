// app/api/webhooks/route.ts - Simplified for one-time payments
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import supabaseAdmin from "../../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: NextRequest) {
  try {
    // Read raw body
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    
    if (!sig) {
      console.error("Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`📦 Received event: ${event.type} (${event.id})`);

    // Check for duplicate event processing
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`✅ Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Log the event for idempotency
    await supabaseAdmin.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
      created_at: new Date().toISOString(),
    });

    // Handle the events we care about
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handleSuccessfulPayment(paymentIntent);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      default:
        console.log(`🤷 Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await supabaseAdmin
      .from("stripe_events")
      .update({ 
        processed: true,
        processed_at: new Date().toISOString() 
      })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error("❌ Webhook processing error:", err.message);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Payment succeeded: ${paymentIntent.id}`);
  
  const customerEmail = paymentIntent.metadata.customer_email;
  if (!customerEmail) {
    console.error("No customer email in payment intent metadata");
    return;
  }

  try {
    // Get or create user
    let { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          email: customerEmail,
          stripe_customer_id: paymentIntent.customer as string,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return;
      }
      user = newUser;
    } else if (userError) {
      console.error("Error fetching user:", userError);
      return;
    }

    // Record the purchase
    await supabaseAdmin.from("purchases").insert({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'paid',
      created_at: new Date().toISOString(),
    });

    console.log(`✅ Purchase recorded for user: ${customerEmail}`);

  } catch (error) {
    console.error("Error handling successful payment:", error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`🛒 Checkout completed: ${session.id}`);
  
  const customerEmail = session.customer_details?.email || session.metadata?.customer_email;
  if (!customerEmail) {
    console.error("No customer email in checkout session");
    return;
  }

  try {
    // Get or create user
    let { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          email: customerEmail,
          stripe_customer_id: session.customer as string,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return;
      }
      user = newUser;
    } else if (userError) {
      console.error("Error fetching user:", userError);
      return;
    }

    // Update user with stripe customer ID if not set
    if (session.customer && !user) {
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: session.customer as string })
        .eq("id", user.id);
    }

    console.log(`✅ Checkout completed for user: ${customerEmail}`);

  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
}
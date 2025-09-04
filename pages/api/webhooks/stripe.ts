import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get raw body for webhook verification
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).send("Missing Stripe signature");

  let event: Stripe.Event;

  try {
    const buf = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId as string | undefined;

        if (userId && session.customer) {
          await supabase
            .from("users")
            .update({
              stripe_customer_id: session.customer.toString(),
              subscription_status: "active",
              plan_type: "paid",
            })
            .eq("id", userId);

          console.log(`✅ User ${userId} upgraded to active`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer.toString();
        const status = sub.status; // active, past_due, canceled, etc.

        await supabase
          .from("users")
          .update({
            subscription_status: status,
            plan_type: "paid",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`🔄 Subscription update: ${customerId} -> ${status}`);
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.canceled": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer.toString();

        await supabase
          .from("users")
          .update({
            subscription_status: "canceled",
            plan_type: "free",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`🛑 Subscription canceled: ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook handler failed");
  }
}

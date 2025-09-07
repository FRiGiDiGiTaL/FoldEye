// pages/api/subscribe.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};
  const valid = typeof email === "string" && /\S+@\S+\.\S+/.test(email);
  if (!valid) {
    return res.status(400).json({ error: "Invalid email" });
  }

  // TODO: Save email to your database or mailing list here.
  return res.status(200).json({ success: true });
}

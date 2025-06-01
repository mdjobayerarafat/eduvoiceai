
// This file is no longer needed as we are using Stripe Payment Links and a webhook for actual subscription handling.
// You can safely delete this file.
// The logic for actual subscription updates is now in /api/stripe/webhook/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ message: 'This endpoint is deprecated. Subscription is handled via Stripe webhooks.' }, { status: 410 });
}

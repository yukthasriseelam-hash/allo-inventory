# Allo Inventory Reservation System

**Live app:** https://allo-inventory-bfuz-m6y5oj89p-yuktha-sris-projects-c2ecee16.vercel.app  
**GitHub:** https://github.com/yukthasriseelam-hash/allo-inventory

---

## What I Built

A reservation system that holds inventory for 10 minutes while a customer completes payment. The hard part isn't the CRUD — it's making sure two people can't reserve the same last unit simultaneously. That's what I focused most of my time on.

---

## Running Locally

Prerequisites: Node.js, a Supabase account, an Upstash account

1. Clone and install

```bash
git clone https://github.com/yukthasriseelam-hash/allo-inventory
cd allo-inventory
npm install
```

2. Create a `.env` file in the root folder with these variables
DATABASE_URL="your-supabase-pooler-connection-string"
DIRECT_URL="your-supabase-pooler-connection-string"
UPSTASH_REDIS_REST_URL="your-upstash-rest-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-rest-token"
CRON_SECRET="any-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
3. Run migrations and seed the database

```bash
npx prisma migrate dev
npx prisma db seed
```

4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000 and you will see 3 products across 2 warehouses with real stock levels.

---

## The Concurrency Problem and How I Solved It

This was the core of the exercise. The naive approach reads stock, checks availability, then writes the reservation. The problem is those steps are separate — two requests can both read "1 unit available" at the same millisecond, both pass the check, and both succeed. That oversells the product.

I considered a few approaches. Redis distributed locks are correct but add infrastructure complexity. SELECT FOR UPDATE locks the row too long under load. I went with an atomic SQL UPDATE:

```sql
UPDATE "Inventory"
SET "reservedUnits" = "reservedUnits" + quantity
WHERE id = inventoryId
  AND ("totalUnits" - "reservedUnits") >= quantity
```

The check and the write happen in one operation. The database serializes row-level writes, so if two requests race for the last unit, exactly one UPDATE affects 1 row and proceeds. The other affects 0 rows and gets a 409. No locks, no extra infrastructure.

---

## How Expiry Works in Production

I used two mechanisms:

Lazy cleanup — every time someone tries to confirm a reservation, the endpoint checks expiresAt first. If expired, it releases the stock and returns 410 immediately. This handles the most common case.

Cron cleanup — a Vercel Cron job runs daily and batch-releases any PENDING reservations past their expiry. This catches reservations where the user closed their browser and never came back.

Honest limitation: Vercel free tier restricts cron to once per day. In production I would use a job queue like Inngest or BullMQ for minute-level accuracy. The lazy cleanup makes this acceptable for now.

---

## Bonus: Idempotency

The reserve endpoint supports an Idempotency-Key header. If a client retries the same request due to a network failure, the server checks Redis for a cached response and returns it without creating a duplicate reservation. Keys expire after 24 hours.

---

## Trade-offs and What I Would Do Differently

No authentication — reservations are not tied to a user session. In production I would attach reservations to authenticated users and reject requests from non-owners.

No real-time updates — if someone else reserves the last unit, the product listing does not update until you refresh. I would add polling or Server-Sent Events to keep stock counts live.

Cron granularity — daily cron is a free tier limitation. Lazy cleanup makes it workable but it is not ideal.

Quantity fixed at 1 — the UI always reserves 1 unit. The API and data model support arbitrary quantities but I kept the UI simple to focus time on correctness.

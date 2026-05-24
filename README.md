# Allo Inventory Reservation System

Live demo: https://allo-inventory-bfuz-m6y5oj89p-yuktha-sris-projects-c2ecee16.vercel.app

## What this is
An inventory reservation system for multi-warehouse retail. When a customer 
proceeds to checkout, units are held for 10 minutes. If payment succeeds, 
the reservation is confirmed and stock is permanently decremented. If it 
expires or is cancelled, stock is released back.

## How to run locally

1. Clone the repo: `git clone https://github.com/yukthasriseelam-hash/allo-inventory`
2. `cd allo-inventory`
3. `npm install`
4. Create `.env` file with your DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, CRON_SECRET
5. `npx prisma migrate dev`
6. `npx prisma db seed`
7. `npm run dev` — open http://localhost:3000

## How concurrency is handled

The reservation endpoint uses an atomic SQL UPDATE with a conditional check:

The query increments reservedUnits only if enough stock is available.
If two requests arrive simultaneously for the last unit, the database 
serializes the writes — exactly one UPDATE succeeds and proceeds. 
The other gets 0 rows affected and returns a 409. No application-level 
locks needed.

## How expiry works in production

Two mechanisms work together:
- Lazy cleanup: The confirm endpoint checks expiresAt on read. If expired, 
  it atomically releases the hold and returns 410 to the user.
- Cron cleanup: A Vercel Cron job runs daily and batch-releases all PENDING 
  reservations past their expiresAt.

## Idempotency (bonus)

If a client sends an Idempotency-Key header, the server checks Redis for 
a cached response first. On success, the response is stored in Redis for 
24 hours. Retries with the same key get the original response without 
creating a duplicate reservation.

## Trade-offs and what I'd improve with more time

- No authentication — reservations aren't tied to user accounts
- Cron runs daily on free Vercel plan — lazy cleanup handles expiry in the meantime
- No real-time stock updates on product list after reserving
- UI is functional but minimal
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { createReservationSchema } from '@/lib/validations'

const RESERVATION_WINDOW_MS = 10 * 60 * 1000

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    include: { inventory: { include: { product: true, warehouse: true } } }
  })
  return NextResponse.json(reservations)
}

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get('Idempotency-Key')

    if (idempotencyKey) {
      try {
        const cached = await redis.get(`idem:${idempotencyKey}`)
        if (cached) return NextResponse.json(cached, { status: 201 })
      } catch {}
    }

    const body = await req.json()
    const parsed = createReservationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { inventoryId, quantity } = parsed.data

    const reservation = await prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = "reservedUnits" + ${quantity}
        WHERE id = ${inventoryId}
          AND ("totalUnits" - "reservedUnits") >= ${quantity}
      `

      if (updated === 0) throw new Error('INSUFFICIENT_STOCK')

      return tx.reservation.create({
        data: {
          inventoryId,
          quantity,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
        },
        include: {
          inventory: { include: { product: true, warehouse: true } }
        }
      })
    })

    if (idempotencyKey) {
      try {
        await redis.set(`idem:${idempotencyKey}`, reservation, { ex: 86400 })
      } catch {}
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
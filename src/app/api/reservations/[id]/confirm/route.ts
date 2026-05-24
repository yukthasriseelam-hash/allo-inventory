import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ error: `Already ${reservation.status.toLowerCase()}` }, { status: 409 })
  }
  if (new Date() > reservation.expiresAt) {
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'RELEASED' } }),
      prisma.inventory.update({ where: { id: reservation.inventoryId }, data: { reservedUnits: { decrement: reservation.quantity } } })
    ])
    return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })
  }

  const [confirmed] = await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: 'CONFIRMED' } }),
    prisma.inventory.update({
      where: { id: reservation.inventoryId },
      data: { totalUnits: { decrement: reservation.quantity }, reservedUnits: { decrement: reservation.quantity } }
    })
  ])

  return NextResponse.json(confirmed)
}
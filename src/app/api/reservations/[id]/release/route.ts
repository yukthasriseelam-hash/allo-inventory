import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation || reservation.status !== 'PENDING') {
    return NextResponse.json({ error: 'No active reservation found' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: 'RELEASED' } }),
    prisma.inventory.update({ where: { id: reservation.inventoryId }, data: { reservedUnits: { decrement: reservation.quantity } } })
  ])

  return NextResponse.json({ message: 'Released successfully' })
}
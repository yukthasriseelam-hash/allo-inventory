import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expired = await prisma.reservation.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } }
  })

  for (const r of expired) {
    await prisma.$transaction([
      prisma.reservation.update({ where: { id: r.id }, data: { status: 'RELEASED' } }),
      prisma.inventory.update({ where: { id: r.inventoryId }, data: { reservedUnits: { decrement: r.quantity } } })
    ])
  }

  return NextResponse.json({ released: expired.length })
}
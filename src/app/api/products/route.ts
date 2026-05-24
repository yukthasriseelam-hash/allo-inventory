import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      inventory: {
        include: { warehouse: true }
      }
    }
  })

  const result = products.map(p => ({
    ...p,
    inventory: p.inventory.map(inv => ({
      id: inv.id,
      warehouse: inv.warehouse,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
    }))
  }))

  return NextResponse.json(result)
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.reservation.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  const wh1 = await prisma.warehouse.create({
    data: { name: 'Mumbai Central', location: 'Mumbai, Maharashtra' }
  })
  const wh2 = await prisma.warehouse.create({
    data: { name: 'Delhi North', location: 'Delhi, NCR' }
  })

  const p1 = await prisma.product.create({
    data: { name: 'Wireless Headphones', description: 'Noise-cancelling, 30hr battery', price: 2999 }
  })
  const p2 = await prisma.product.create({
    data: { name: 'Mechanical Keyboard', description: 'TKL, Cherry MX Brown switches', price: 4499 }
  })
  const p3 = await prisma.product.create({
    data: { name: 'USB-C Hub', description: '7-in-1 multiport adapter', price: 1299 }
  })

  await prisma.inventory.createMany({
    data: [
      { productId: p1.id, warehouseId: wh1.id, totalUnits: 2, reservedUnits: 0 },
      { productId: p1.id, warehouseId: wh2.id, totalUnits: 5, reservedUnits: 0 },
      { productId: p2.id, warehouseId: wh1.id, totalUnits: 8, reservedUnits: 0 },
      { productId: p2.id, warehouseId: wh2.id, totalUnits: 3, reservedUnits: 0 },
      { productId: p3.id, warehouseId: wh1.id, totalUnits: 1, reservedUnits: 0 },
      { productId: p3.id, warehouseId: wh2.id, totalUnits: 10, reservedUnits: 0 },
    ]
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
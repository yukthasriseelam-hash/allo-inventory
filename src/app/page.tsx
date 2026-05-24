'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type InventoryItem = {
  id: string
  availableUnits: number
  warehouse: { name: string; location: string }
}

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory: InventoryItem[]
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  async function handleReserve(inventoryId: string) {
    setReserving(inventoryId)
    setError(null)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId, quantity: 1 }),
      })

      if (res.status === 409) {
        setError('Sorry! Someone just grabbed the last unit. Please try another warehouse.')
        setReserving(null)
        return
      }

      const reservation = await res.json()
      router.push(`/checkout/${reservation.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setReserving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500 text-lg">Loading products...</p>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Allo Store</h1>
        <p className="text-gray-500 mt-1">
          Reserve a unit — we hold it for 10 minutes while you checkout.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6">
        {products.map(product => (
          <Card key={product.id} className="shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <span className="text-2xl font-bold text-gray-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-sm text-gray-500">{product.description}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-gray-700 mb-3">Available at:</p>
              <div className="space-y-2">
                {product.inventory.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{inv.warehouse.name}</p>
                      <p className="text-xs text-gray-400">{inv.warehouse.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          inv.availableUnits > 3
                            ? 'secondary'
                            : inv.availableUnits > 0
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {inv.availableUnits > 0
                          ? `${inv.availableUnits} left`
                          : 'Out of stock'}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={inv.availableUnits === 0 || reserving === inv.id}
                        onClick={() => handleReserve(inv.id)}
                      >
                        {reserving === inv.id ? 'Reserving...' : 'Reserve'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
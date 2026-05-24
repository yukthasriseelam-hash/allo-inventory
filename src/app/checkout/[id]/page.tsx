'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { use } from 'react'

type Reservation = {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  quantity: number
  inventory: {
    product: { name: string; price: number; description: string }
    warehouse: { name: string; location: string }
  }
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const secs = (secondsLeft % 60).toString().padStart(2, '0')
  const isUrgent = secondsLeft < 60
  const isExpired = secondsLeft === 0

  return (
    <div className={`text-center p-4 rounded-lg border-2 ${
      isExpired ? 'border-red-400 bg-red-50' :
      isUrgent ? 'border-yellow-400 bg-yellow-50' :
      'border-green-400 bg-green-50'
    }`}>
      {isExpired ? (
        <p className="text-red-600 font-semibold text-lg">⏰ Hold has expired</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Hold expires in</p>
          <p className={`text-5xl font-mono font-bold ${isUrgent ? 'text-yellow-600' : 'text-green-700'}`}>
            {mins}:{secs}
          </p>
          {isUrgent && (
            <p className="text-yellow-600 text-sm mt-1">Hurry! Less than a minute left.</p>
          )}
        </>
      )}
    </div>
  )
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(r => r.json())
      .then(setReservation)
      .finally(() => setLoading(false))
  }, [id])

  const handleConfirm = useCallback(async () => {
    setActing(true)
    setError(null)
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })

    if (res.status === 410) {
      setError('Your hold expired before we could confirm. Please reserve again.')
      setReservation(r => r ? { ...r, status: 'RELEASED' } : r)
      setActing(false)
      return
    }

    setReservation(r => r ? { ...r, status: 'CONFIRMED' } : r)
    setActing(false)
  }, [id])

  const handleCancel = useCallback(async () => {
    setActing(true)
    await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
    setReservation(r => r ? { ...r, status: 'RELEASED' } : r)
    setActing(false)
  }, [id])

  if (loading) {
    return <div className="flex justify-center mt-20 text-gray-500">Loading reservation...</div>
  }

  if (!reservation) {
    return <div className="flex justify-center mt-20 text-red-500">Reservation not found.</div>
  }

  const { product, warehouse } = reservation.inventory

  return (
    <main className="max-w-lg mx-auto p-6 mt-10">
      <button
        onClick={() => router.push('/')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-6 block"
      >
        ← Back to products
      </button>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-semibold text-lg">{product.name}</p>
            <p className="text-sm text-gray-500">{product.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              📦 {warehouse.name} — {warehouse.location}
            </p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-500">Qty: {reservation.quantity}</span>
              <span className="text-xl font-bold">₹{product.price.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge
              variant={
                reservation.status === 'CONFIRMED' ? 'default' :
                reservation.status === 'RELEASED' ? 'destructive' :
                'secondary'
              }
              className="text-sm px-3 py-1"
            >
              {reservation.status}
            </Badge>
          </div>

          {reservation.status === 'PENDING' && (
            <Countdown expiresAt={reservation.expiresAt} />
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {reservation.status === 'CONFIRMED' && (
            <div className="text-center p-5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-bold text-xl">🎉 Purchase Confirmed!</p>
              <p className="text-green-600 text-sm mt-1">Your order has been placed successfully.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
                Continue Shopping
              </Button>
            </div>
          )}

          {reservation.status === 'RELEASED' && (
            <div className="text-center p-5 bg-gray-50 border rounded-lg">
              <p className="text-gray-600 font-medium">This reservation has ended.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
                Back to Products
              </Button>
            </div>
          )}

          {reservation.status === 'PENDING' && (
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleConfirm} disabled={acting}>
                {acting ? 'Processing...' : '✓ Confirm Purchase'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={acting}>
                Cancel
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </main>
  )
}
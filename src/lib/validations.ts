import { z } from 'zod'

export const createReservationSchema = z.object({
  inventoryId: z.string(),
  quantity: z.number().int().positive().max(10),
})
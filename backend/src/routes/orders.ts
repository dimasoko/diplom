import { Router } from 'express'
import {
  createOrderHandler,
  repeatOrderHandler,
  updateOrderStatusHandler,
} from '../controllers/orders.js'
import { requireAuth, requireStaff } from '../middleware/requireAuth.js'

const router = Router()

router.post('/', requireAuth, createOrderHandler)
router.post('/my/:id/repeat', requireAuth, repeatOrderHandler)
router.patch('/:id/status', requireAuth, requireStaff, updateOrderStatusHandler)

export default router

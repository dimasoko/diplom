import { Router } from 'express'
import {
  createAddonHandler,
  deleteAddonHandler,
  getAddonHandler,
  listAddonsHandler,
  updateAddonHandler,
} from '../controllers/addons.js'
import { requireAuth, requireStaff } from '../middleware/requireAuth.js'

const router = Router()

router.get('/', listAddonsHandler)
router.get('/:id', getAddonHandler)
router.post('/', requireAuth, requireStaff, createAddonHandler)
router.put('/:id', requireAuth, requireStaff, updateAddonHandler)
router.delete('/:id', requireAuth, requireStaff, deleteAddonHandler)

export default router

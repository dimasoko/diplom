import { Router } from 'express'
import {
  createMenuItemHandler,
  deleteMenuItemHandler,
  getMenuItemHandler,
  listMenuItemsHandler,
  updateMenuItemHandler,
} from '../controllers/menu.js'
import { requireAuth, requireStaff } from '../middleware/requireAuth.js'

const router = Router()

router.get('/', listMenuItemsHandler)
router.get('/:id', getMenuItemHandler)
router.post('/', requireAuth, requireStaff, createMenuItemHandler)
router.put('/:id', requireAuth, requireStaff, updateMenuItemHandler)
router.delete('/:id', requireAuth, requireStaff, deleteMenuItemHandler)

export default router

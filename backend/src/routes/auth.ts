import { Router } from 'express'
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from '../controllers/auth.js'

const router = Router()

router.post('/register', registerHandler)
router.post('/login', loginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', logoutHandler)

export default router

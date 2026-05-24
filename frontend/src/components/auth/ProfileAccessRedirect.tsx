import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from 'rizzui'

export default function ProfileAccessRedirect() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/auth/login', { replace: true, state: { reason: 'profile-auth-required' } })
    }, 1400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [navigate])

  const handleGoToLogin = () => {
    setOpen(false)
    navigate('/auth/login', { replace: true, state: { reason: 'profile-auth-required' } })
  }

  return (
    <Modal isOpen={open} onClose={handleGoToLogin} size="sm">
      <div className="space-y-4 bg-white p-6">
        <h2 className="font-display text-3xl text-accent-red">Нужен вход</h2>
        <p className="text-sm leading-relaxed text-text-main/80">
          Профиль доступен только авторизованным пользователям. Сейчас перенаправим вас на страницу входа.
        </p>
        <Button type="button" className="w-full border-primary bg-primary text-white hover:bg-primary/90" onClick={handleGoToLogin}>
          Перейти ко входу
        </Button>
      </div>
    </Modal>
  )
}

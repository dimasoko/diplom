import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Button, Input, Password } from 'rizzui'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import Header from '../../components/layout/Header'
import TileGridPattern from '../../components/layout/TileGridPattern'
import Footer from '../../components/layout/Footer'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

type AuthResponse = {
  user?: Record<string, unknown> | null
  accessToken?: string
  token?: string
}

const registerSchema = z
  .object({
    name: z.string().min(2, 'Минимум 2 символа'),
    phone: z.string().min(6, 'Минимум 6 символов'),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(6, 'Минимум 6 символов'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  })

type RegisterFormValues = z.infer<typeof registerSchema>

function getAuthPayload(data: AuthResponse) {
  const accessToken = data.accessToken ?? data.token ?? ''
  return {
    user: data.user ?? null,
    accessToken,
  }
}

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '', confirmPassword: '' },
  })

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const response = await apiClient.post<ApiEnvelope<AuthResponse>>('/auth/register', {
        name: values.name,
        phone: values.phone,
        password: values.password,
      })
      return response.data.data
    },
    onSuccess: (authData) => {
      const payload = getAuthPayload(authData)
      if (!payload.accessToken) return
      setAuth(payload)
      navigate('/profile')
    },
  })

  return (
    <div className="min-h-screen bg-bg-base text-text-main">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28">
        <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-3xl lg:grid-cols-2">
          <TileGridPattern className="hidden h-full min-h-[540px] lg:flex lg:items-center lg:justify-center">
            <p className="font-display text-6xl text-primary">we are BASE</p>
          </TileGridPattern>

          <div className="flex items-center justify-center bg-white p-8">
            <form onSubmit={handleSubmit((values) => registerMutation.mutate(values))} className="w-full max-w-md space-y-5 rounded-3xl bg-bg-surface p-8">
              <h1 className="font-display text-4xl text-primary">Регистрация</h1>

              <Input type="text" label="Имя" placeholder="Ваше имя" error={errors.name?.message} {...register('name')} />
              <Input type="tel" label="Телефон" placeholder="+7..." error={errors.phone?.message} {...register('phone')} />
              <Password label="Пароль" placeholder="Введите пароль" error={errors.password?.message} {...register('password')} />
              <Password label="Повторите пароль" placeholder="Введите пароль еще раз" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

              <Button type="submit" isLoading={registerMutation.isPending} className="w-full border-primary bg-primary text-white hover:bg-primary/90">
                Зарегистрироваться
              </Button>

              {registerMutation.isError ? <p className="text-sm text-accent-red">Не удалось выполнить регистрацию</p> : null}

              <p className="text-sm text-text-main/70">
                Уже есть аккаунт?{' '}
                <Link to="/auth/login" className="text-primary underline decoration-dashed underline-offset-4">
                  Войти
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

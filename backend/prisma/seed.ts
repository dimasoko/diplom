import 'dotenv/config'
import * as bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'

import {
  AddonType,
  OrderItemSize,
  OrderStatus,
  PrismaClient,
  UserRole,
} from '../src/generated/prisma/client'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required in .env')

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

const USERS = {
  admin: { name: 'Администратор', phone: '+79990000001', password: 'Admin123!', role: UserRole.ADMIN },
  staff: { name: 'Бариста', phone: '+79990000003', password: 'Staff123!', role: UserRole.STAFF },
  client: { name: 'Клиент', phone: '+79990000002', password: 'Client123!', role: UserRole.CLIENT },
} as const

const CATEGORIES = [
  { name: 'Классика', slug: 'klassika' },
  { name: 'Авторские напитки', slug: 'avtorskie-napitki' },
  { name: 'Альтернатива', slug: 'alternativa' },
  { name: 'Кухня', slug: 'kuhnya' },
]

const ADDONS = [
  { name: 'Ваниль', type: AddonType.SYRUP, price: 70 },
  { name: 'Карамель', type: AddonType.SYRUP, price: 70 },
  { name: 'Лесной орех', type: AddonType.SYRUP, price: 70 },
  { name: 'Кокосовое молоко', type: AddonType.MILK, price: 90 },
  { name: 'Овсяное молоко', type: AddonType.MILK, price: 90 },
  { name: 'Миндальное молоко', type: AddonType.MILK, price: 110 },
  { name: 'Лимон', type: AddonType.EXTRA, price: 40 },
  { name: 'Мята', type: AddonType.EXTRA, price: 40 },
  { name: 'Корица', type: AddonType.EXTRA, price: 20 },
  { name: 'Мед', type: AddonType.EXTRA, price: 50 },
  { name: 'Доп. шот эспрессо', type: AddonType.EXTRA, price: 100 },
]

type SeedItem = {
  categorySlug: string
  name: string
  description?: string
  price_s?: number | null
  price_m?: number | null
  price_l?: number | null
  is_popular?: boolean
  photo_url?: string
}

const MENU_ITEMS: SeedItem[] = [
  { categorySlug: 'klassika', name: 'Эспрессо', description: '40 мл, яркий и плотный.', price_s: 130, photo_url: '/assets/menu/espresso.jpg' },
  { categorySlug: 'klassika', name: 'Американо', description: '200/300/400 мл.', price_s: 160, price_m: 190, price_l: 220, photo_url: '/assets/menu/americano.jpg' },
  { categorySlug: 'klassika', name: 'Капучино', description: '200/300/400 мл.', price_s: 210, price_m: 250, price_l: 290, is_popular: true, photo_url: '/assets/menu/cappuccino.jpg' },
  { categorySlug: 'klassika', name: 'Латте', description: '200/300/400 мл.', price_s: 220, price_m: 270, price_l: 320, photo_url: '/assets/menu/latte.jpg' },
  { categorySlug: 'klassika', name: 'Флэт Уайт', description: 'Только 300 мл.', price_m: 280, is_popular: true, photo_url: '/assets/menu/flat-white.jpg' },
  { categorySlug: 'klassika', name: 'Кортадо', description: 'Только 200 мл.', price_s: 220, photo_url: '/assets/menu/espresso.jpg' },
  { categorySlug: 'avtorskie-napitki', name: 'Раф Лаванда', description: 'Нежный сливочный вкус.', price_s: 260, price_m: 310, price_l: 360, photo_url: '/assets/menu/raf-lavender.jpg' },
  { categorySlug: 'avtorskie-napitki', name: 'Латте Соленая карамель', description: 'Сливочный и сладко-соленый профиль.', price_s: 250, price_m: 300, price_l: 350, is_popular: true, photo_url: '/assets/menu/latte-caramel.jpg' },
  { categorySlug: 'avtorskie-napitki', name: 'Мокко Апельсин', description: 'Шоколад и цитрус.', price_s: 270, price_m: 320, price_l: 370, photo_url: '/assets/menu/mocha.jpg' },
  { categorySlug: 'alternativa', name: 'V60', description: 'Чистая чашка, фильтр 300 мл.', price_m: 300, photo_url: '/assets/menu/v60.jpg' },
  { categorySlug: 'alternativa', name: 'Аэропресс', description: 'Сбалансированная фильтрация, 250 мл.', price_m: 290, photo_url: '/assets/menu/aeropress.jpg' },
  { categorySlug: 'alternativa', name: 'Фильтр дня', description: 'Смена зерна каждый день, 300/400 мл.', price_m: 260, price_l: 310, photo_url: '/assets/menu/v60.jpg' },
  { categorySlug: 'kuhnya', name: 'Сэндвич с индейкой', description: '210 г · КБЖУ: 420/26/18/34', price_m: 390, photo_url: '/assets/menu/sandwich.jpg' },
  { categorySlug: 'kuhnya', name: 'Паста с томатами', description: '300 г · КБЖУ: 510/18/16/70', price_m: 450, photo_url: '/assets/menu/pasta-tomato.jpg' },
  { categorySlug: 'kuhnya', name: 'Паста с песто', description: '320 г · КБЖУ: 560/20/24/68', price_m: 470, photo_url: '/assets/menu/pasta-pesto.jpg' },
  { categorySlug: 'kuhnya', name: 'Круассан с ветчиной и сыром', description: '160 г · КБЖУ: 390/16/22/32', price_m: 290, photo_url: '/assets/menu/croissant.jpg' },
]

const EVENTS = [
  {
    title: 'Каппинг Эфиопии',
    description:
      'Приглашаем на дегустацию лотов эфиопии: от яркой кислотности до шоколадной ноты. Бариста расскажет про регион, обработку и параметры заваривания, затем сравним чашки в формате blind tasting.',
    event_date: new Date(new Date().getFullYear(), 5, 12, 18, 30),
    published_at: new Date(new Date().getFullYear(), 4, 28, 10, 0),
    photo_url: '/assets/events/event-1.jpg',
    is_published: true,
  },
  {
    title: 'Лекция: кофе и вода',
    description:
      'Разберём, как минерализация, жёсткость и температура воды меняют экстракцию и баланс чашки. На практике сварим один и тот же лот на разной воде и сравним вкус, послевкусие и плотность тела напитка.',
    event_date: new Date(new Date().getFullYear(), 6, 4, 19, 0),
    published_at: new Date(new Date().getFullYear(), 5, 16, 10, 0),
    photo_url: '/assets/events/event-2.jpg',
    is_published: true,
  },
  {
    title: 'Открытый brew-bar',
    description:
      'Открытая смена на brew-bar: V60, AeroPress и batch brew под руководством бариста. Гости смогут выбрать метод, задать вопросы по рецепту и попробовать свежую обжарку в спокойном формате без записи.',
    event_date: new Date(new Date().getFullYear(), 7, 8, 17, 0),
    published_at: new Date(new Date().getFullYear(), 6, 22, 10, 0),
    photo_url: '/assets/events/event-3.jpg',
    is_published: true,
  },
]

const GALLERY = [
  { title: 'Интерьер BASE', image_url: '/assets/gallery/gallery-1.jpg', sort_order: 1 },
  { title: 'Бар и посадка', image_url: '/assets/gallery/gallery-2.jpg', sort_order: 2 },
  { title: 'Заваривание', image_url: '/assets/gallery/gallery-3.jpg', sort_order: 3 },
  { title: 'Кофейные зёрна', image_url: '/assets/gallery/gallery-4.jpg', sort_order: 4 },
  { title: 'Латте-арт', image_url: '/assets/gallery/gallery-5.jpg', sort_order: 5 },
  { title: 'Уютный зал', image_url: '/assets/gallery/gallery-6.jpg', sort_order: 6 },
  { title: 'Чашка кофе', image_url: '/assets/gallery/gallery-7.jpg', sort_order: 7 },
  { title: 'Детали сервиса', image_url: '/assets/gallery/gallery-8.jpg', sort_order: 8 },
]

const BARISTAS = [
  {
    name: 'Анна',
    role_title: 'Старший бариста',
    fun_fact: 'Любит экспериментировать с фильтр-кофе и сезонными зернами.',
    photo_url: '/assets/baristas/barista-1.jpg',
    hover_color: '#2B2D9E',
  },
  {
    name: 'Максим',
    role_title: 'Бариста',
    fun_fact: 'Готовит самый стабильный капучино в утренний час-пик.',
    photo_url: '/assets/baristas/barista-2.jpg',
    hover_color: '#C0392B',
  },
  {
    name: 'Ирина',
    role_title: 'Бариста',
    fun_fact: 'Собирает спешелти-зерно и отвечает за обучающие каппинги.',
    photo_url: '/assets/baristas/barista-3.jpg',
    hover_color: '#2B2D9E',
  },
]

async function clearData() {
  await prisma.orderItemAddon.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.bonusTransaction.deleteMany()
  await prisma.order.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.pushSubscription.deleteMany()
  await prisma.contactRequest.deleteMany()
  await prisma.event.deleteMany()
  await prisma.gallery.deleteMany()
  await prisma.barista.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.addon.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

async function createUsers() {
  const [adminHash, staffHash, clientHash] = await Promise.all([
    bcrypt.hash(USERS.admin.password, 10),
    bcrypt.hash(USERS.staff.password, 10),
    bcrypt.hash(USERS.client.password, 10),
  ])

  await prisma.user.createMany({
    data: [
      { name: USERS.admin.name, phone: USERS.admin.phone, role: USERS.admin.role, password_hash: adminHash },
      { name: USERS.staff.name, phone: USERS.staff.phone, role: USERS.staff.role, password_hash: staffHash },
      { name: USERS.client.name, phone: USERS.client.phone, role: USERS.client.role, password_hash: clientHash },
    ],
  })
}

async function createCategories() {
  await prisma.category.createMany({ data: CATEGORIES })
  const rows = await prisma.category.findMany({ select: { id: true, slug: true } })
  return new Map(rows.map((row) => [row.slug, row.id]))
}

async function createMenuItems(categoryMap: Map<string, string>) {
  await prisma.menuItem.createMany({
    data: MENU_ITEMS.map((item) => ({
      category_id: categoryMap.get(item.categorySlug)!,
      name: item.name,
      description: item.description ?? null,
      price_s: item.price_s ?? null,
      price_m: item.price_m ?? null,
      price_l: item.price_l ?? null,
      is_popular: item.is_popular ?? false,
      photo_url: item.photo_url ?? null,
    })),
  })
}

async function createAddons() {
  await prisma.addon.createMany({ data: ADDONS })
}

async function createEvents() {
  await prisma.event.createMany({ data: EVENTS })
}

async function createGallery() {
  await prisma.gallery.createMany({ data: GALLERY })
}

async function createBaristas() {
  await prisma.barista.createMany({ data: BARISTAS })
}

async function createOrders() {
  const client = await prisma.user.findUnique({ where: { phone: USERS.client.phone }, select: { id: true } })
  if (!client) return

  const menuItems = await prisma.menuItem.findMany({ where: { deleted_at: null }, select: { id: true, price_s: true, price_m: true, price_l: true } })
  const addons = await prisma.addon.findMany({ where: { deleted_at: null }, select: { id: true, price: true } })
  if (menuItems.length === 0) return

  const statuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.BREWING, OrderStatus.READY, OrderStatus.ISSUED]
  const year = new Date().getFullYear()

  for (let i = 0; i < 40; i += 1) {
    const item = menuItems[i % menuItems.length]
    const size = item.price_l ? OrderItemSize.L : item.price_m ? OrderItemSize.M : OrderItemSize.S
    const basePrice = size === OrderItemSize.L ? (item.price_l ?? item.price_m ?? item.price_s ?? 200) : size === OrderItemSize.M ? (item.price_m ?? item.price_s ?? 200) : (item.price_s ?? 200)
    const createdAt = new Date(Date.UTC(year, Math.floor(i / 4), (i % 27) + 1, 8 + (i % 11), (i * 11) % 60))
    const pickup = new Date(createdAt)
    pickup.setUTCMinutes(pickup.getUTCMinutes() + 25)
    const selectedAddons = i % 2 === 0 ? [addons[i % addons.length]] : []
    const addonSum = selectedAddons.reduce((acc, addon) => acc + addon.price, 0)
    const total = basePrice + addonSum
    const status = statuses[i % statuses.length]

    await prisma.order.create({
      data: {
        user_id: client.id,
        status,
        total_price: total,
        bonus_used: status === OrderStatus.ISSUED ? (i % 3) * 10 : 0,
        bonus_earned: status === OrderStatus.ISSUED ? Math.floor(total * 0.05) : 0,
        created_at: createdAt,
        pickup_time: pickup,
        order_items: {
          create: [{
            menu_item_id: item.id,
            size,
            quantity: 1,
            calculated_item_price: basePrice,
            order_item_addons: {
              create: selectedAddons.map((addon) => ({ addon_id: addon.id, calculated_addon_price: addon.price })),
            },
          }],
        },
      },
    })
  }
}

async function main() {
  await clearData()
  await createUsers()
  const categoryMap = await createCategories()
  await createMenuItems(categoryMap)
  await createAddons()
  await createEvents()
  await createGallery()
  await createBaristas()
  await createOrders()
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })

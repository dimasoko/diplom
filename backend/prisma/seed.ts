import 'dotenv/config'

import bcrypt from 'bcryptjs'
import { AddonType, PrismaClient, UserRole } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function clearDatabase() {
  await prisma.orderItemAddon.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.bonusTransaction.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.pushSubscription.deleteMany()
  await prisma.contactRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.addon.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

async function seedCategories() {
  const categories = [
    {
      name: '\u041a\u043b\u0430\u0441\u0441\u0438\u043a\u0430',
      slug: 'klassika',
      description:
        '\u0411\u0430\u0437\u043e\u0432\u044b\u0435 \u043a\u043e\u0444\u0435\u0439\u043d\u044b\u0435 \u043d\u0430\u043f\u0438\u0442\u043a\u0438 \u043d\u0430 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c',
      sort_order: 1,
    },
    {
      name: '\u0410\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u0430',
      slug: 'alternativa',
      description:
        '\u0424\u0438\u043b\u044c\u0442\u0440-\u043a\u043e\u0444\u0435 \u0438 \u0430\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u043d\u044b\u0435 \u0441\u043f\u043e\u0441\u043e\u0431\u044b \u0437\u0430\u0432\u0430\u0440\u0438\u0432\u0430\u043d\u0438\u044f',
      sort_order: 2,
    },
    {
      name: '\u0410\u0432\u0442\u043e\u0440\u0441\u043a\u0438\u0435',
      slug: 'avtorskie',
      description:
        '\u0424\u0438\u0440\u043c\u0435\u043d\u043d\u044b\u0435 \u043d\u0430\u043f\u0438\u0442\u043a\u0438 \u043a\u043e\u0444\u0435\u0439\u043d\u0438 Base',
      sort_order: 3,
    },
    {
      name: '\u0421\u043e \u043b\u044c\u0434\u043e\u043c',
      slug: 'so_ldom',
      description:
        '\u0425\u043e\u043b\u043e\u0434\u043d\u044b\u0435 \u043a\u043e\u0444\u0435\u0439\u043d\u044b\u0435 \u043d\u0430\u043f\u0438\u0442\u043a\u0438',
      sort_order: 4,
    },
    {
      name: '\u041d\u0435 \u043a\u043e\u0444\u0435',
      slug: 'ne_kofe',
      description:
        '\u041d\u0430\u043f\u0438\u0442\u043a\u0438 \u0431\u0435\u0437 \u043a\u043e\u0444\u0435\u0438\u043d\u0430',
      sort_order: 5,
    },
  ]

  await prisma.category.createMany({ data: categories })

  const createdCategories = await prisma.category.findMany({
    where: {
      slug: {
        in: categories.map((category) => category.slug),
      },
    },
  })

  return Object.fromEntries(
    createdCategories.map((category) => [category.slug, category.id]),
  )
}

async function seedMenuItems(categoryIds: Record<string, string>) {
  await prisma.menuItem.createMany({
    data: [
      {
        category_id: categoryIds.klassika,
        name: '\u041a\u0430\u043f\u0443\u0447\u0438\u043d\u043e S',
        slug: 'kapuchino-s',
        description:
          '\u041a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u0430\u043f\u0443\u0447\u0438\u043d\u043e, \u043e\u0431\u044a\u0451\u043c S',
        price: 180,
        is_available: true,
        is_featured: true,
      },
      {
        category_id: categoryIds.klassika,
        name: '\u041a\u0430\u043f\u0443\u0447\u0438\u043d\u043e M',
        slug: 'kapuchino-m',
        description:
          '\u041a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u0430\u043f\u0443\u0447\u0438\u043d\u043e, \u043e\u0431\u044a\u0451\u043c M',
        price: 200,
        is_available: true,
        is_featured: true,
      },
      {
        category_id: categoryIds.klassika,
        name: '\u041a\u0430\u043f\u0443\u0447\u0438\u043d\u043e L',
        slug: 'kapuchino-l',
        description:
          '\u041a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u0430\u043f\u0443\u0447\u0438\u043d\u043e, \u043e\u0431\u044a\u0451\u043c L',
        price: 230,
        is_available: true,
        is_featured: true,
      },
      {
        category_id: categoryIds.alternativa,
        name: 'V60',
        slug: 'v60',
        description:
          '\u0424\u0438\u043b\u044c\u0442\u0440-\u043a\u043e\u0444\u0435, \u043f\u0440\u0438\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d\u043d\u044b\u0439 \u0447\u0435\u0440\u0435\u0437 V60',
        price: 220,
        is_available: true,
        is_featured: false,
      },
      {
        category_id: categoryIds.avtorskie,
        name: '\u0420\u0430\u0444 \u041b\u0430\u0432\u0430\u043d\u0434\u0430',
        slug: 'raf-lavanda',
        description:
          '\u0424\u0438\u0440\u043c\u0435\u043d\u043d\u044b\u0439 \u0440\u0430\u0444 \u0441 \u043b\u0430\u0432\u0430\u043d\u0434\u043e\u0432\u044b\u043c \u043f\u0440\u043e\u0444\u0438\u043b\u0435\u043c',
        price: 280,
        is_available: true,
        is_featured: true,
      },
      {
        category_id: categoryIds.so_ldom,
        name: '\u0410\u0439\u0441 \u041b\u0430\u0442\u0442\u0435',
        slug: 'ajs-latte',
        description:
          '\u0425\u043e\u043b\u043e\u0434\u043d\u044b\u0439 \u043b\u0430\u0442\u0442\u0435 \u0441\u043e \u043b\u044c\u0434\u043e\u043c',
        price: 240,
        is_available: true,
        is_featured: false,
      },
      {
        category_id: categoryIds.ne_kofe,
        name: '\u041a\u0430\u043a\u0430\u043e',
        slug: 'kakao',
        description:
          '\u041a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043a\u0430\u043a\u0430\u043e \u043d\u0430 \u043c\u043e\u043b\u043e\u043a\u0435',
        price: 190,
        is_available: true,
        is_featured: false,
      },
    ],
  })
}

async function seedAddons() {
  await prisma.addon.createMany({
    data: [
      {
        name: '\u0410\u043b\u044c\u0442. \u043c\u043e\u043b\u043e\u043a\u043e \u043e\u0432\u0441\u044f\u043d\u043e\u0435',
        description:
          '\u0417\u0430\u043c\u0435\u043d\u0430 \u043a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043c\u043e\u043b\u043e\u043a\u0430 \u043d\u0430 \u043e\u0432\u0441\u044f\u043d\u043e\u0435',
        price: 70,
        type: AddonType.MILK,
        is_available: true,
        sort_order: 1,
      },
      {
        name: '\u0410\u043b\u044c\u0442. \u043c\u043e\u043b\u043e\u043a\u043e \u043a\u043e\u043a\u043e\u0441\u043e\u0432\u043e\u0435',
        description:
          '\u0417\u0430\u043c\u0435\u043d\u0430 \u043a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043c\u043e\u043b\u043e\u043a\u0430 \u043d\u0430 \u043a\u043e\u043a\u043e\u0441\u043e\u0432\u043e\u0435',
        price: 80,
        type: AddonType.MILK,
        is_available: true,
        sort_order: 2,
      },
      {
        name: '\u0421\u0438\u0440\u043e\u043f \u0432\u0430\u043d\u0438\u043b\u044c',
        description: '\u0412\u0430\u043d\u0438\u043b\u044c\u043d\u044b\u0439 \u0441\u0438\u0440\u043e\u043f',
        price: 40,
        type: AddonType.SYRUP,
        is_available: true,
        sort_order: 3,
      },
      {
        name: '\u0414\u043e\u043f. \u0448\u043e\u0442 \u044d\u0441\u043f\u0440\u0435\u0441\u0441\u043e',
        description:
          '\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u0440\u0446\u0438\u044f \u044d\u0441\u043f\u0440\u0435\u0441\u0441\u043e',
        price: 60,
        type: AddonType.EXTRA,
        is_available: true,
        sort_order: 4,
      },
    ],
  })
}

async function seedUsers() {
  const adminPasswordHash = await bcrypt.hash('Admin12345!', 10)
  const clientPasswordHash = await bcrypt.hash('Client12345!', 10)

  await prisma.user.create({
    data: {
      email: 'admin@base-coffee.ru',
      phone: '+79001000001',
      password_hash: adminPasswordHash,
      first_name: 'Base',
      last_name: 'Admin',
      role: UserRole.ADMIN,
      bonus_balance: 0,
      is_active: true,
    },
  })

  await prisma.user.create({
    data: {
      email: 'client@base-coffee.ru',
      phone: '+79001000002',
      password_hash: clientPasswordHash,
      first_name: '\u0418\u0432\u0430\u043d',
      last_name: '\u041a\u043b\u0438\u0435\u043d\u0442',
      role: UserRole.CLIENT,
      bonus_balance: 150,
      qr_code: 'BASE-CLIENT-0001',
      is_active: true,
    },
  })
}

async function main() {
  await clearDatabase()

  const categoryIds = await seedCategories()

  await seedMenuItems(categoryIds)
  await seedAddons()
  await seedUsers()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })

import webpush, { PushSubscription } from "web-push";

import { HttpError } from "../../errors/http-error";
import { prisma } from "../../lib/prisma";
import {
  PushCampaignInput,
  PushHistoryQueryInput,
  SubscribePushInput,
} from "./push.validation";

const getVapidPublicKey = (): string => {
  const value = process.env.VAPID_PUBLIC_KEY;
  if (!value) {
    throw new HttpError(500, "VAPID_PUBLIC_KEY is not configured");
  }
  return value;
};

const getVapidPrivateKey = (): string => {
  const value = process.env.VAPID_PRIVATE_KEY;
  if (!value) {
    throw new HttpError(500, "VAPID_PRIVATE_KEY is not configured");
  }
  return value;
};

const getVapidSubject = (): string => {
  return process.env.VAPID_SUBJECT ?? "mailto:hello@wearebase.coffee";
};

const setupWebPush = () => {
  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey());
};

type SubscribePushParams = {
  userId: string;
  payload: SubscribePushInput;
};

export const subscribePush = async ({ userId, payload }: SubscribePushParams) => {
  return prisma.pushSubscription.upsert({
    where: {
      endpoint: payload.endpoint,
    },
    update: {
      user_id: userId,
      p256dh: payload.p256dh,
      auth: payload.auth,
    },
    create: {
      user_id: userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
    },
  });
};

export const getPushPublicKey = (): string => getVapidPublicKey();

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const toWebPushSubscription = (subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): PushSubscription => ({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.p256dh,
    auth: subscription.auth,
  },
});

const sendPayloadToSubscriptions = async (
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> => {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  setupWebPush();

  const message = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), message);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
        }
      }
    }),
  );

  return { sent, failed };
};

export const sendOrderStatusPush = async (params: {
  userId: string;
  orderId: string;
  publicNumber: string;
  statusRu: string;
}) => {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: params.userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  const result = await sendPayloadToSubscriptions(subscriptions, {
    title: `Заказ #${params.publicNumber}`,
    body: `Статус изменился: ${params.statusRu}`,
    url: "/profile",
    tag: `order-${params.orderId}`,
  });

  if (result.sent > 0 || result.failed > 0) {
    await prisma.pushNotificationLog.create({
      data: {
        title: `Заказ #${params.publicNumber}`,
        body: `Статус изменился: ${params.statusRu}`,
        target: "ORDER_STATUS",
        sent_count: result.sent,
        failed_count: result.failed,
      },
    });
  }

  return result;
};

export const sendCampaignPush = async (params: {
  payload: PushCampaignInput;
  createdById: string;
}) => {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { endpoint: true, p256dh: true, auth: true },
  });

  const result = await sendPayloadToSubscriptions(subscriptions, {
    title: params.payload.title,
    body: params.payload.body,
    url: params.payload.url || "/",
    tag: "campaign",
  });

  const log = await prisma.pushNotificationLog.create({
    data: {
      title: params.payload.title,
      body: params.payload.body,
      target: "BROADCAST",
      sent_count: result.sent,
      failed_count: result.failed,
      created_by_id: params.createdById,
    },
  });

  return { log, ...result };
};

export const getPushHistory = async ({ page, limit }: PushHistoryQueryInput) => {
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.pushNotificationLog.count(),
    prisma.pushNotificationLog.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


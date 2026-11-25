import Notification from "@/lib/models/Notification";

export async function notify({ instituteId, userId, type = "system", title, message = "", link = "" }) {
  if (!userId || !title) return null;
  return Notification.create({
    institute: instituteId,
    user: userId,
    type,
    title,
    message,
    link,
  });
}

export async function notifyMany(payloads) {
  if (!payloads.length) return [];
  return Notification.insertMany(payloads);
}

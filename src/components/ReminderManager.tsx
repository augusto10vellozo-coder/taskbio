import { useEffect, useRef } from "react";
import { parseISO, setHours, setMinutes, subMinutes } from "date-fns";
import { useTrilha } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";

const MAX_DELAY = 24 * 60 * 60 * 1000;

export function ReminderManager() {
  const { user } = useAuth();
  const { plan } = useTrilha();
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (!user || !("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    Object.entries(plan).forEach(([dateKey, blocks]) => blocks.forEach((block) => {
      if (!block.reminderMinutes || block.done) return;
      const [hour = 0, minute = 0] = block.time.split(":").map(Number);
      const eventTime = setMinutes(setHours(parseISO(dateKey), hour), minute);
      const reminderTime = subMinutes(eventTime, block.reminderMinutes);
      const delay = reminderTime.getTime() - now.getTime();
      if (delay <= 0 || delay > MAX_DELAY) return;
      timers.current.push(window.setTimeout(() => {
        new Notification(block.title, { body: `Começa às ${block.time}. Abra o Trilha para ver os detalhes.` });
      }, delay));
    }));

    return () => timers.current.forEach(window.clearTimeout);
  }, [plan, user]);

  return null;
}
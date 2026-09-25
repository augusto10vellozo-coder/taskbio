import { useEffect, useRef, useState } from "react";
import { parseISO, setHours, setMinutes, subMinutes } from "date-fns";
import { useTrilha } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const MAX_DELAY = 24 * 60 * 60 * 1000;

export function ReminderManager() {
  const { user } = useAuth();
  const { plan } = useTrilha();
  const timers = useRef<number[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user) { setEnabled(false); return; }
    supabase.from("profiles").select("preferences").eq("id", user.id).single().then(({ data }) => {
      const preferences = data?.preferences;
      setEnabled(Boolean(preferences && typeof preferences === "object" && !Array.isArray(preferences) && preferences["reminders"] !== false));
    });
  }, [user?.id]);

  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (!user || !enabled || !("Notification" in window) || Notification.permission !== "granted") return;

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
  }, [enabled, plan, user]);

  return null;
}
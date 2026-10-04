import { useEffect, useRef, useState } from "react";
import { parseISO, setHours, setMinutes, subMinutes } from "date-fns";
import { useTaskBio } from "@/lib/trilha-store";
import { addDays, format } from "date-fns";
import { defaultReminderPreferences, readReminderPreferences, reminderPreferencesEvent, type ReminderPreferences } from "@/lib/reminder-preferences";

const MAX_DELAY = 24 * 60 * 60 * 1000;

export function ReminderManager() {
  const { plan } = useTaskBio();
  const timers = useRef<number[]>([]);
  const [preferences, setPreferences] = useState<ReminderPreferences>(defaultReminderPreferences);

  useEffect(() => {
    const update = () => setPreferences(readReminderPreferences());
    update();
    window.addEventListener(reminderPreferencesEvent, update);
    return () => window.removeEventListener(reminderPreferencesEvent, update);
  }, []);

  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (!preferences.enabled || !("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    Object.entries(plan).forEach(([dateKey, blocks]) => blocks.forEach((block) => {
       const reminderMinutes = block.reminderMinutes ?? (block.kind === "treino" && preferences.workoutEnabled ? 30 : undefined);
       if (!reminderMinutes || block.done || (block.kind === "treino" && !preferences.workoutEnabled)) return;
      const [hour = 0, minute = 0] = block.time.split(":").map(Number);
      const eventTime = setMinutes(setHours(parseISO(dateKey), hour), minute);
      const reminderTime = subMinutes(eventTime, reminderMinutes);
      const delay = reminderTime.getTime() - now.getTime();
      if (delay <= 0 || delay > MAX_DELAY) return;
      timers.current.push(window.setTimeout(() => {
        new Notification(block.title, { body: `Começa às ${block.time}. Abra o TaskBio para ver os detalhes.` });
      }, delay));
    }));

    if (preferences.dailyEnabled) {
      const tomorrow = addDays(now, 1);
      const [hour = 20, minute = 0] = preferences.dailyTime.split(":").map(Number);
      let reminderTime = setMinutes(setHours(now, hour), minute);
      if (reminderTime <= now) reminderTime = addDays(reminderTime, 1);
      const delay = reminderTime.getTime() - now.getTime();
      timers.current.push(window.setTimeout(() => {
        new Notification("Planeje o dia seguinte", { body: `Organize sua agenda de ${format(tomorrow, "dd/MM")} no TaskBio.` });
      }, delay));
    }

    return () => timers.current.forEach(window.clearTimeout);
  }, [plan, preferences]);

  return null;
}
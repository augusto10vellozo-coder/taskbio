export type ReminderPreferences = {
  enabled: boolean;
  dailyEnabled: boolean;
  dailyTime: string;
  workoutEnabled: boolean;
  streakEnabled: boolean;
  streakTime: string;
};

export const reminderStorageKey = "trilha:reminder-preferences";
export const reminderPreferencesEvent = "trilha:reminder-preferences-changed";
export const defaultReminderPreferences: ReminderPreferences = {
  enabled: false,
  dailyEnabled: true,
  dailyTime: "20:00",
  workoutEnabled: true,
  streakEnabled: true,
  streakTime: "21:00",
};

export function readReminderPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(reminderStorageKey) ?? "null") as Partial<ReminderPreferences> | null;
    return saved ? { ...defaultReminderPreferences, ...saved } : defaultReminderPreferences;
  } catch { return defaultReminderPreferences; }
}

export function saveReminderPreferences(preferences: ReminderPreferences) {
  localStorage.setItem(reminderStorageKey, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(reminderPreferencesEvent));
}
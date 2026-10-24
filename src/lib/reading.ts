import { addDays, format } from "date-fns";
import type { Book, SessionEntry } from "./engagement";

export const DEFAULT_READING_GOAL = 180;
export const READING_STATUS_LABEL = { lendo: "Lendo", concluido: "Concluído", quero: "Quero ler" } as const;

export type BookResult = { title: string; author: string; totalPages?: number | undefined; cover?: string | undefined };

/** Percent of a book read; null when the total is unknown. */
export function bookPercent(b: Pick<Book, "pagesRead" | "totalPages" | "progressMode" | "progressPercent">) {
  if (b.progressMode === "percent" && b.progressPercent !== undefined) return b.progressPercent;
  if (!b.totalPages || b.totalPages <= 0) return null;
  return Math.min(100, Math.round((b.pagesRead / b.totalPages) * 100));
}

/** Consecutive days with at least one reading session, ending today (or yesterday). */
export function readingStreak(sessions: Pick<SessionEntry, "date">[], today: Date) {
  const days = new Set(sessions.map((s) => s.date));
  const k = (d: Date) => format(d, "yyyy-MM-dd");
  let cursor = days.has(k(today)) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(k(cursor)) && n < 3650) { n += 1; cursor = addDays(cursor, -1); }
  return n;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const validReadingGoal = (value: number) => Number.isInteger(value) && value >= 30 && value <= 1680;
export const validReadingPercent = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
export const READING_MILESTONES = [7, 30, 100];

export function bestReadingStreak(sessions: Pick<SessionEntry, "date">[]) {
  const days = [...new Set(sessions.map(s => s.date))].sort();
  let best = 0, run = 0, previous = "";
  for (const day of days) {
    run = previous && format(addDays(new Date(`${previous}T12:00:00`), 1), "yyyy-MM-dd") === day ? run + 1 : 1;
    best = Math.max(best, run); previous = day;
  }
  return best;
}

export function readingSummary(sessions: SessionEntry[]) {
  return { sessions: sessions.length, minutes: sessions.reduce((n, s) => n + s.minutes, 0), pages: sessions.reduce((n, s) => n + (s.pages ?? 0), 0), books: new Set(sessions.map(s => s.bookId || norm(s.title)).filter(Boolean)).size };
}

export function remainingReadingMinutes(book: Book, sessions: SessionEntry[]) {
  const measured = sessions.filter(s => s.bookId === book.id && (s.pages ?? 0) > 0 && s.minutes > 0);
  const pages = measured.reduce((n, s) => n + (s.pages ?? 0), 0);
  if (!book.totalPages || !pages) return null;
  const pct = bookPercent(book);
  const remainingPages = book.progressMode === "percent" && pct !== null ? book.totalPages * (1 - pct / 100) : book.totalPages - book.pagesRead;
  return Math.max(0, Math.round(remainingPages * measured.reduce((n, s) => n + s.minutes, 0) / pages));
}

export function applyReadingProgress(book: Book, session: Pick<SessionEntry, "pages" | "progressMode" | "progressPercent">): Book {
  if (session.progressMode === "percent") return { ...book, progressMode: "percent", progressPercent: session.progressPercent ?? bookPercent(book) ?? 0 };
  return { ...book, progressMode: "pages", pagesRead: book.totalPages ? Math.min(book.totalPages, book.pagesRead + (session.pages ?? 0)) : book.pagesRead + (session.pages ?? 0) };
}

/** Old free-text sessions whose title matches the book are linked to it. */
export function linkLegacySessions(sessions: SessionEntry[], book: Pick<Book, "id" | "title">) {
  const t = norm(book.title);
  return sessions.map((s) => (!s.bookId && s.title && norm(s.title) === t ? { ...s, bookId: book.id } : s));
}

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\uFFFD-\uFFFF]/g, "").replace(/\s+/g, " ").trim();
const https = (u?: string) => u?.replace(/^http:/, "https:");

export async function searchBooks(q: string, signal?: AbortSignal): Promise<BookResult[]> {
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`, { signal: signal ?? null });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json() as { items?: { volumeInfo: { title?: string; authors?: string[]; pageCount?: number; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } }[] };
    const items = (j.items ?? []).filter((i) => i.volumeInfo.title).map((i): BookResult => ({ title: clean(i.volumeInfo.title!), author: (i.volumeInfo.authors ?? []).join(", "), totalPages: i.volumeInfo.pageCount || undefined, cover: https(i.volumeInfo.imageLinks?.thumbnail ?? i.volumeInfo.imageLinks?.smallThumbnail) }));
    if (items.length) return items;
  } catch (e) { if ((e as Error).name === "AbortError") throw e; }
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=title,author_name,number_of_pages_median,cover_i`, { signal: signal ?? null });
  if (!r.ok) return [];
  const j = await r.json() as { docs?: { title: string; author_name?: string[]; number_of_pages_median?: number; cover_i?: number }[] };
  return (j.docs ?? []).map((d): BookResult => ({ title: clean(d.title), author: (d.author_name ?? []).join(", "), totalPages: d.number_of_pages_median || undefined, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined }));
}

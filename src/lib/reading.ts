import { addDays, format } from "date-fns";
import type { Book, SessionEntry } from "./engagement";

export const DEFAULT_READING_GOAL = 180;
export const READING_STATUS_LABEL = { lendo: "Lendo", concluido: "Concluído", quero: "Quero ler" } as const;

export type BookResult = { title: string; author: string; totalPages?: number | undefined; cover?: string | undefined };

/** Percent of a book read; null when the total is unknown. */
export function bookPercent(b: Pick<Book, "pagesRead" | "totalPages">) {
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

/** Old free-text sessions whose title matches the book are linked to it. */
export function linkLegacySessions(sessions: SessionEntry[], book: Pick<Book, "id" | "title">) {
  const t = norm(book.title);
  return sessions.map((s) => (!s.bookId && s.title && norm(s.title) === t ? { ...s, bookId: book.id } : s));
}

const https = (u?: string) => u?.replace(/^http:/, "https:");

export async function searchBooks(q: string, signal?: AbortSignal): Promise<BookResult[]> {
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`, { signal });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json() as { items?: { volumeInfo: { title?: string; authors?: string[]; pageCount?: number; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } }[] };
    const items = (j.items ?? []).filter((i) => i.volumeInfo.title).map((i): BookResult => ({ title: i.volumeInfo.title!, author: (i.volumeInfo.authors ?? []).join(", "), totalPages: i.volumeInfo.pageCount || undefined, cover: https(i.volumeInfo.imageLinks?.thumbnail ?? i.volumeInfo.imageLinks?.smallThumbnail) }));
    if (items.length) return items;
  } catch (e) { if ((e as Error).name === "AbortError") throw e; }
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=title,author_name,number_of_pages_median,cover_i`, { signal });
  if (!r.ok) return [];
  const j = await r.json() as { docs?: { title: string; author_name?: string[]; number_of_pages_median?: number; cover_i?: number }[] };
  return (j.docs ?? []).map((d): BookResult => ({ title: d.title, author: (d.author_name ?? []).join(", "), totalPages: d.number_of_pages_median || undefined, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined }));
}

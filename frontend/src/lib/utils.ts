import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(amount);
}

export function getLocalDateString(date: Date = new Date()): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfMonthString(date: Date = new Date()): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function getEndOfMonthString(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return getLocalDateString(d);
}

export function formatDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr.split('T')[0] : getLocalDateString(dateStr);
  const parts = str.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return str;
}

export function formatDateShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr.split('T')[0] : getLocalDateString(dateStr);
  const parts = str.split('-').map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
  }
  return str;
}


import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('BDT', '৳');
}

export function formatDate(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function listingPath(listing: { slug?: string; title?: string; id?: string }): string {
  const identifier = listing.slug || listing.id;
  return identifier ? `/listings/${encodeURIComponent(identifier)}` : '/profile';
}

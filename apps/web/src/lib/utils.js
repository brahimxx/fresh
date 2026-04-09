import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateSalonSlug(salon) {
  if (!salon || !salon.id) return '';
  const parts = [];
  if (salon.name) parts.push(salon.name);
  if (salon.city) parts.push(salon.city);
  parts.push(salon.id);
  
  return parts.join('-')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, ''); // trim dashes from ends
}

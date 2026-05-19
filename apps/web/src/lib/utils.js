import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { encodeId } from "@/lib/id";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateSalonSlug(salon) {
  if (!salon || !salon.id) return '';
  const parts = [];
  if (salon.name) parts.push(salon.name);
  if (salon.city) parts.push(salon.city);
  
  // Build the human-readable portion (lowercased, normalized)
  const humanPart = parts.join('-')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, ''); // trim dashes from ends

  // Append the encoded ID (preserving case for decoding)
  const encodedId = encodeId(salon.id);
  return humanPart ? `${humanPart}-${encodedId}` : encodedId;
}

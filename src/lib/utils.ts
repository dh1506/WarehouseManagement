import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Muc dich: Gop className theo quy tac tailwind.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

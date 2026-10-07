import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names and intelligently merges Tailwind CSS classes.
 * Resolves conflicts between utility classes (e.g., overriding padding or margins).
 * 
 * @param inputs - An array of class values, strings, objects, or conditional arrays.
 * @returns A single merged string of valid class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

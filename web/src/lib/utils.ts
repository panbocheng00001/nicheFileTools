import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional class name splicing: clsx + tailwind-merge (Design document §1 stipulates that cn should be used uniformly)*/
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

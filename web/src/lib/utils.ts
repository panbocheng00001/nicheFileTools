import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 条件类名拼接：clsx + tailwind-merge（设计文档 §1 规定统一用 cn） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// whenever passing large payload through server actions, we first have to stringify and then parse that value
export const parseStringify = (value: unknown) => {
  return JSON.parse(JSON.stringify(value));
};

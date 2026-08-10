"use client";

import { useCalendarSync } from "@/hooks/useCalendarSync";

/** Só liga o polling — montado uma vez no layout do app. */
export function CalendarSyncPoller() {
  useCalendarSync();
  return null;
}

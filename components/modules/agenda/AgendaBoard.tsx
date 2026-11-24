"use client";

import { useState } from "react";
import { useStoredPreference } from "@/hooks/useStoredPreference";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { Badge, Button, Card, IconButton } from "@/components/ui";
import { eventCategoryLabels } from "@/lib/labels";
import {
  addUtcDays,
  cn,
  formatDateLongBR,
  formatDateRangeBR,
  formatMonthYearBR,
  parseDateOnly,
  toDateInputValue,
  todayInputValue,
} from "@/lib/utils";
import { groupEventsByDate, type AgendaEvent } from "@/lib/agenda-shared";
import { EventFormModal } from "./EventForm";
import { SyncStatusIcon } from "./SyncStatusIcon";

type View = "semana" | "mes" | "lista";

const VIEW_KEY = "agenda-visao";

const viewLabels: Record<View, string> = {
  semana: "Semana",
  mes: "Mês",
  lista: "Lista",
};

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Cor do evento pela categoria, reaproveitando os tokens dos selos. */
const categoryStyles: Record<string, string> = {
  ACE: "bg-badge-ace-bg text-badge-ace-text",
  TAROT: "bg-badge-tarot-bg text-badge-tarot-text",
  ESPIRITUAL: "bg-badge-tarot-bg text-badge-tarot-text",
  CREATIVE: "bg-badge-creative-bg text-badge-creative-text",
  SAUDE: "bg-badge-creative-bg text-badge-creative-text",
  PESSOAL: "bg-badge-pessoal-bg text-badge-pessoal-text",
};

function categoryStyle(category: string) {
  return categoryStyles[category] ?? "bg-badge-casa-bg text-badge-casa-text";
}

function timeLabel(event: AgendaEvent) {
  if (event.allDay || !event.time) return "Dia inteiro";
  return event.endTime ? `${event.time}–${event.endTime}` : event.time;
}

/** Segunda-feira da semana de `date` ("YYYY-MM-DD"). */
function weekStart(date: string) {
  const d = parseDateOnly(date)!;
  return addUtcDays(d, -((d.getUTCDay() + 6) % 7));
}

function shiftAnchor(anchor: string, view: View, direction: 1 | -1) {
  const d = parseDateOnly(anchor)!;
  if (view === "mes") {
    return toDateInputValue(
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + direction, 1)),
    );
  }
  return toDateInputValue(addUtcDays(d, 7 * direction));
}

/** Dias que a grade do mês mostra: semanas inteiras, de segunda a domingo. */
function monthDays(anchor: string) {
  const d = parseDateOnly(anchor)!;
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  const start = weekStart(toDateInputValue(first));
  const days: string[] = [];
  for (let day = start; day <= last || days.length % 7 !== 0; day = addUtcDays(day, 1)) {
    days.push(toDateInputValue(day));
  }
  return days;
}

/** Os de dia inteiro primeiro, depois por horário. */
function sortDay(events: AgendaEvent[]) {
  return [...events].sort((a, b) => {
    const aAll = a.allDay || !a.time;
    const bAll = b.allDay || !b.time;
    if (aAll !== bAll) return aAll ? -1 : 1;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

type ModalState = { event?: AgendaEvent; date: string } | null;

function EventChip({
  event,
  onClick,
  compact = false,
}: {
  event: AgendaEvent;
  onClick: () => void;
  compact?: boolean;
}) {
  const allDay = event.allDay || !event.time;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.title} · ${timeLabel(event)}`}
      className={cn(
        "flex w-full min-w-0 flex-col rounded-md px-2 text-left transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        compact ? "py-0.5" : "gap-0.5 py-1.5",
        categoryStyle(event.category),
      )}
    >
      <span
        className={cn(
          "font-medium",
          // Na semana a coluna é estreita: duas linhas leem melhor que um corte.
          compact ? "truncate text-[11px]" : "line-clamp-2 break-words text-xs",
        )}
      >
        {!allDay && compact && <span className="mr-1 opacity-75">{event.time}</span>}
        {event.title}
      </span>
      {!compact && !allDay && (
        <span className="text-[11px] opacity-75">{timeLabel(event)}</span>
      )}
    </button>
  );
}

function WeekView({
  anchor,
  today,
  byDate,
  onOpen,
}: {
  anchor: string;
  today: string;
  byDate: Map<string, AgendaEvent[]>;
  onOpen: (state: ModalState) => void;
}) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => toDateInputValue(addUtcDays(start, i)));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date, index) => {
        const events = sortDay(byDate.get(date) ?? []);
        const isToday = date === today;
        return (
          <div
            key={date}
            className={cn(
              "group flex min-h-[26rem] min-w-0 flex-col gap-2 rounded-xl border bg-surface p-2 shadow-elevation",
              isToday ? "border-accent/60" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-1 px-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  {weekdayLabels[index]}
                </span>
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-sm font-semibold",
                    isToday ? "bg-accent text-accent-contrast" : "text-text-primary",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
              </div>
              <IconButton
                revealOnHover
                onClick={() => onOpen({ date })}
                aria-label={`Novo evento em ${formatDateLongBR(parseDateOnly(date)!)}`}
                className="sm:size-7"
              >
                <Plus size={14} />
              </IconButton>
            </div>

            <div className="flex flex-col gap-1.5">
              {events.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  onClick={() => onOpen({ event, date })}
                />
              ))}
            </div>

            {/* O resto da coluna também cria evento: é o alvo maior da tela. */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onOpen({ date })}
              className="min-h-8 flex-1 rounded-md transition-colors hover:bg-hover"
            />
          </div>
        );
      })}
    </div>
  );
}

const MONTH_VISIBLE = 3;

function MonthView({
  anchor,
  today,
  byDate,
  onOpen,
  onShowWeek,
}: {
  anchor: string;
  today: string;
  byDate: Map<string, AgendaEvent[]>;
  onOpen: (state: ModalState) => void;
  onShowWeek: (date: string) => void;
}) {
  const days = monthDays(anchor);
  const month = anchor.slice(0, 7);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-elevation">
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map((label) => (
          <span
            key={label}
            className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const events = sortDay(byDate.get(date) ?? []);
          const inMonth = date.startsWith(month);
          const isToday = date === today;
          const hidden = events.length - MONTH_VISIBLE;
          return (
            <div
              key={date}
              className={cn(
                "group flex min-h-28 min-w-0 flex-col gap-1 border-border p-1.5",
                index % 7 !== 6 && "border-r",
                index < days.length - 7 && "border-b",
                !inMonth && "bg-hover",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-semibold",
                    isToday
                      ? "bg-accent text-accent-contrast"
                      : inMonth
                        ? "text-text-primary"
                        : "text-text-secondary/60",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                <IconButton
                  revealOnHover
                  onClick={() => onOpen({ date })}
                  aria-label={`Novo evento em ${formatDateLongBR(parseDateOnly(date)!)}`}
                  className="sm:size-6"
                >
                  <Plus size={13} />
                </IconButton>
              </div>
              {events.slice(0, MONTH_VISIBLE).map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  compact
                  onClick={() => onOpen({ event, date })}
                />
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onShowWeek(date)}
                  className="rounded px-1 text-left text-[11px] font-medium text-text-secondary hover:text-text-primary"
                >
                  + {hidden} {hidden === 1 ? "outro" : "outros"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  events,
  today,
  onOpen,
}: {
  events: AgendaEvent[];
  today: string;
  onOpen: (state: ModalState) => void;
}) {
  // A lista começa em hoje: abrir a agenda e ter que rolar a semana passada
  // inteira até chegar no dia de hoje era o problema. O passado recente fica a
  // um clique, para quem só tem a lista (o celular).
  const [showPast, setShowPast] = useState(false);
  const recentStart = toDateInputValue(addUtcDays(parseDateOnly(today)!, -7));
  const pastCount = events.filter((e) => e.date < today && e.date >= recentStart).length;
  const groups = groupEventsByDate(
    events.filter((e) => e.date >= (showPast ? recentStart : today)),
  );

  return (
    <div className="flex flex-col gap-3">
      {pastCount > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="self-start rounded text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          {showPast ? "Esconder os últimos 7 dias" : `Ver os últimos 7 dias (${pastCount})`}
        </button>
      )}
      {groups.length === 0 && (
        <Card>
          <p className="text-sm text-text-secondary">
            Nada marcado daqui para frente. Crie um evento ou sincronize com o
            Google Calendar.
          </p>
        </Card>
      )}
      {groups.map((group) => (
        <Card key={group.date}>
          <h2
            className={cn(
              "mb-2 text-sm font-semibold",
              group.date === today ? "text-accent-ink" : "text-text-primary",
            )}
          >
            {formatDateLongBR(parseDateOnly(group.date)!)}
            {group.date === today && " · hoje"}
          </h2>

          <ul className="divide-y divide-border">
            {sortDay(group.items).map((event) => (
              <li key={event.id} className="group flex items-start gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-text-secondary">{timeLabel(event)}</span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <SyncStatusIcon status={event.syncStatus} />
                    <span className="truncate text-text-primary">{event.title}</span>
                  </div>
                  {event.description && (
                    <span className="truncate text-xs text-text-secondary">
                      {event.description}
                    </span>
                  )}
                </div>

                {/* No celular o selo roubava o espaço do título ("SIMM…"). */}
                <Badge className={cn("hidden shrink-0 sm:inline-flex", categoryStyle(event.category))}>
                  {eventCategoryLabels[event.category] ?? event.category}
                </Badge>

                <IconButton
                  revealOnHover
                  onClick={() => onOpen({ event, date: event.date })}
                  aria-label={`Editar ${event.title}`}
                >
                  <Pencil size={15} />
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function AgendaBoard({ initialEvents }: { initialEvents: AgendaEvent[] }) {
  const today = todayInputValue();
  const [storedView, setStoredView] = useStoredPreference(VIEW_KEY, "semana");
  const view: View = Object.hasOwn(viewLabels, storedView) ? (storedView as View) : "semana";
  const [anchor, setAnchor] = useState(today);
  const [modal, setModal] = useState<ModalState>(null);

  function changeView(next: View) {
    setStoredView(next);
  }

  const byDate = new Map(
    groupEventsByDate(initialEvents).map((group) => [group.date, group.items]),
  );

  const anchorDate = parseDateOnly(anchor)!;
  const periodLabel =
    view === "mes"
      ? formatMonthYearBR(anchorDate.getUTCMonth() + 1, anchorDate.getUTCFullYear())
      : formatDateRangeBR(weekStart(anchor), 7);

  const showingToday =
    view === "mes"
      ? anchor.slice(0, 7) === today.slice(0, 7)
      : toDateInputValue(weekStart(anchor)) === toDateInputValue(weekStart(today));

  return (
    <div className="flex flex-col gap-4">
      {/* Barra da agenda: período à esquerda, visão e criação à direita — a
          mesma ordem de qualquer calendário de desktop. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "hidden items-center gap-1",
            view !== "lista" && "md:flex",
          )}
        >
          <Button
            variant="secondary"
            onClick={() => setAnchor(today)}
            disabled={showingToday}
            className="min-h-9 py-1"
          >
            Hoje
          </Button>
          <IconButton onClick={() => setAnchor(shiftAnchor(anchor, view, -1))} aria-label="Anterior">
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton onClick={() => setAnchor(shiftAnchor(anchor, view, 1))} aria-label="Próximo">
            <ChevronRight size={16} />
          </IconButton>
          <h2 className="ml-1 text-base font-semibold text-text-primary">
            {periodLabel}
          </h2>
        </div>
        {view === "lista" && (
          <h2 className="hidden text-base font-semibold text-text-primary md:block">
            Próximos eventos
          </h2>
        )}

        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          {/* No celular a grade de 7 colunas não cabe: lá é sempre a lista. */}
          <div
            role="group"
            aria-label="Visão"
            className="hidden rounded-lg border border-border bg-surface p-0.5 md:flex"
          >
            {(Object.keys(viewLabels) as View[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeView(key)}
                aria-pressed={view === key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === key
                    ? "bg-accent/10 text-accent-ink"
                    : "text-text-secondary hover:bg-hover hover:text-text-primary",
                )}
              >
                {viewLabels[key]}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setModal({ date: today })}
            className="w-full md:min-h-9 md:w-auto md:py-1"
          >
            <Plus size={16} /> Novo evento
          </Button>
        </div>
      </div>

      <div className={cn(view !== "lista" && "md:hidden")}>
        <ListView events={initialEvents} today={today} onOpen={setModal} />
      </div>

      {view === "semana" && (
        <div className="hidden md:block">
          <WeekView anchor={anchor} today={today} byDate={byDate} onOpen={setModal} />
        </div>
      )}
      {view === "mes" && (
        <div className="hidden md:block">
          <MonthView
            anchor={anchor}
            today={today}
            byDate={byDate}
            onOpen={setModal}
            onShowWeek={(date) => {
              setAnchor(date);
              changeView("semana");
            }}
          />
        </div>
      )}

      {modal && (
        <EventFormModal
          key={modal.event?.id ?? `novo-${modal.date}`}
          event={modal.event}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

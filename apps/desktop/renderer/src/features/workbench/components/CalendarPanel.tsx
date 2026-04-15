import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type CalendarPanelStatus = "loading" | "ready" | "error";
export type CalendarMilestoneStatus = "active" | "upcoming" | "draft" | "done";

export interface CalendarMilestone {
  dateLabel: string;
  description: string;
  id: string;
  status: CalendarMilestoneStatus;
  title: string;
}

export interface CalendarEvent {
  day: number;
  id: string;
  title: string;
  type: "fiction" | "script" | "media" | "system";
}

interface CalendarPanelProps {
  errorMessage: string | null;
  events: CalendarEvent[];
  milestones: CalendarMilestone[];
  onRetry: () => void;
  status: CalendarPanelStatus;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function CalendarPanel(props: CalendarPanelProps) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(() => monthStart(new Date()));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const calendarCells = useMemo(() => {
    const leading = Array.from({ length: firstDay }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    return [...leading, ...days];
  }, [daysInMonth, firstDay]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? undefined, { month: "long", year: "numeric" }),
    [i18n.resolvedLanguage],
  );

  const today = new Date();
  const isCurrentMonth = sameMonth(today, currentMonth);
  const todayDate = today.getDate();

  return (
    <div className="calendar-panel" data-testid="calendar-panel">
      <div className="panel-section">
        <h1 className="screen-title">{t("sidebar.calendar.title")}</h1>
        <p className="panel-subtitle">{t("sidebar.calendar.subtitle")}</p>
      </div>

      <div className="calendar-panel__toolbar">
        <div className="calendar-panel__month-nav">
          <Button
            tone="ghost"
            onClick={() =>
              setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))
            }
            aria-label={t("sidebar.calendar.prevMonth")}
            data-testid="calendar-prev-month"
          >
            <ChevronLeft size={14} />
          </Button>
          <p className="calendar-panel__month-label" data-testid="calendar-month-label">
            {monthFormatter.format(currentMonth)}
          </p>
          <Button
            tone="ghost"
            onClick={() =>
              setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))
            }
            aria-label={t("sidebar.calendar.nextMonth")}
            data-testid="calendar-next-month"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
        <Button tone="ghost" onClick={props.onRetry} data-testid="calendar-reload">
          <RotateCcw size={14} />
          {t("actions.retry")}
        </Button>
      </div>

      {props.status === "loading" ? (
        <div className="calendar-panel__state" data-testid="calendar-loading">
          {t("sidebar.calendar.loading")}
        </div>
      ) : null}

      {props.status === "error" ? (
        <div className="calendar-panel__state calendar-panel__state--error" data-testid="calendar-error">
          <p>{props.errorMessage ?? t("errors.generic")}</p>
          <Button tone="secondary" onClick={props.onRetry}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      {props.status === "ready" ? (
        <>
          <div className="calendar-panel__layout">
            <section className="calendar-panel__milestones" data-testid="calendar-milestones">
              <h3 className="calendar-panel__section-title">{t("sidebar.calendar.milestones")}</h3>
              {props.milestones.length === 0 ? (
                <div className="calendar-panel__state" data-testid="calendar-empty-milestones">
                  <p>{t("sidebar.calendar.emptyMilestones")}</p>
                </div>
              ) : (
                <ul className="calendar-panel__milestone-list">
                  {props.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className={`calendar-milestone calendar-milestone--${milestone.status}`}
                      data-testid={`calendar-milestone-${milestone.id}`}
                    >
                      <p className="calendar-milestone__date">{milestone.dateLabel}</p>
                      <p className="calendar-milestone__title">{milestone.title}</p>
                      <p className="calendar-milestone__desc">{milestone.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="calendar-panel__grid-shell" data-testid="calendar-grid">
              <div className="calendar-panel__weekday-row">
                {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((weekday) => (
                  <span key={weekday}>{t(`sidebar.calendar.weekday.${weekday}`)}</span>
                ))}
              </div>

              <div className="calendar-panel__grid-cells">
                {calendarCells.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="calendar-cell calendar-cell--empty" />;
                  }
                  const dayEvents = props.events.filter((event) => event.day === day);
                  const isToday = isCurrentMonth && day === todayDate;
                  return (
                    <div
                      key={`day-${day}`}
                      className={isToday ? "calendar-cell calendar-cell--today" : "calendar-cell"}
                      data-testid={`calendar-day-${day}`}
                    >
                      <div className="calendar-cell__head">
                        <span>{day}</span>
                        {dayEvents.length > 0 ? (
                          <span className="calendar-cell__badge">{t("sidebar.calendar.eventCount", { count: dayEvents.length })}</span>
                        ) : null}
                      </div>
                      <div className="calendar-cell__events">
                        {dayEvents.slice(0, 2).map((event) => (
                          <p key={event.id} className={`calendar-cell__event calendar-cell__event--${event.type}`}>
                            {event.title}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {props.events.length === 0 ? (
            <div className="calendar-panel__state" data-testid="calendar-empty-events">
              <p>{t("sidebar.calendar.emptyEvents")}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

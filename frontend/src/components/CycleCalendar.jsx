import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import './CycleCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PHASE_MAP = {
  period: { color: '#ef4444', bg: 'rgba(239,68,68,0.2)', label: 'Period', emoji: '🩸' },
  fertile: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Fertile Window', emoji: '🌸' },
  ovulation: { color: '#fbbf24', bg: 'rgba(251,191,36,0.25)', label: 'Ovulation', emoji: '✨' },
  follicular: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Follicular', emoji: '🌱' },
  luteal: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Luteal', emoji: '🌙' },
  predicted_period: { color: '#fb7185', bg: 'rgba(251,113,133,0.15)', label: 'Predicted Period', emoji: '📅' },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CycleCalendar({ cycles = [], prediction = {}, phase = {}, stats = {} }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build a map of date → phase info for the displayed month
  const dayPhaseMap = useMemo(() => {
    const map = {};
    const daysInMonth = getDaysInMonth(year, month);
    const avgCycleLen = stats.avg_cycle_length || 28;
    const avgPeriodLen = stats.avg_period_length || 5;

    // Collect all known cycle start dates sorted ascending
    const cycleStarts = cycles
      .filter(c => c.start_date)
      .map(c => ({ start: new Date(c.start_date), length: c.cycle_length || avgCycleLen, period: c.period_length || avgPeriodLen }))
      .sort((a, b) => a.start - b.start);

    // Add predicted next period
    if (prediction.next_period_date) {
      cycleStarts.push({
        start: new Date(prediction.next_period_date),
        length: avgCycleLen,
        period: avgPeriodLen,
        predicted: true,
      });
    }

    // For each cycle, calculate phases for all days in this month
    cycleStarts.forEach((cycle, idx) => {
      const cycleLen = cycle.length || avgCycleLen;
      const periodLen = cycle.period || avgPeriodLen;
      const ovulationDay = cycleLen - 14; // ~14 days before next period
      const fertileStart = ovulationDay - 5;
      const fertileEnd = ovulationDay + 1;

      // Iterate through each day of the cycle
      for (let d = 0; d < cycleLen + 5; d++) {
        const dayDate = new Date(cycle.start);
        dayDate.setDate(dayDate.getDate() + d);

        // Only process days in the current displayed month
        if (dayDate.getFullYear() !== year || dayDate.getMonth() !== month) continue;

        const dayNum = dayDate.getDate();
        const dateKey = dayNum;
        const cycleDay = d + 1;

        let phaseType = null;
        let phaseLabel = '';

        if (cycleDay <= periodLen) {
          phaseType = cycle.predicted ? 'predicted_period' : 'period';
          phaseLabel = `Period Day ${cycleDay}`;
        } else if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
          if (cycleDay === ovulationDay) {
            phaseType = 'ovulation';
            phaseLabel = 'Ovulation Day';
          } else {
            phaseType = 'fertile';
            phaseLabel = `Fertile (Day ${cycleDay})`;
          }
        } else if (cycleDay <= 13) {
          phaseType = 'follicular';
          phaseLabel = `Follicular (Day ${cycleDay})`;
        } else if (cycleDay > 16) {
          phaseType = 'luteal';
          phaseLabel = `Luteal (Day ${cycleDay})`;
        } else {
          phaseType = 'follicular';
          phaseLabel = `Follicular (Day ${cycleDay})`;
        }

        // Only set if not already set (first cycle data wins for overlapping dates)
        if (!map[dateKey] || phaseType === 'period' || phaseType === 'ovulation') {
          map[dateKey] = {
            type: phaseType,
            label: phaseLabel,
            cycleDay,
            config: PHASE_MAP[phaseType],
          };
        }
      }
    });

    return map;
  }, [cycles, prediction, stats, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Build calendar grid
  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false, key: `prev-${i}` });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      phase: dayPhaseMap[d] || null,
      key: `cur-${d}`,
    });
  }

  // Next month leading days
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, key: `next-${i}` });
  }

  const monthLabel = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  return (
    <div className="cycle-calendar">
      {/* Header */}
      <div className="cal-header">
        <h4>📅 Cycle Calendar</h4>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth}><HiChevronLeft /></button>
          <button className="cal-month-label" onClick={goToday}>{monthLabel}</button>
          <button className="cal-nav-btn" onClick={nextMonth}><HiChevronRight /></button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="cal-weekdays">
        {WEEKDAYS.map(day => (
          <div key={day} className="cal-weekday">{day}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {calendarDays.map((item) => {
          const isSelected = selectedDay === item.key && item.isCurrentMonth;

          return (
            <motion.div
              key={item.key}
              className={`cal-day ${!item.isCurrentMonth ? 'other-month' : ''} ${item.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => item.isCurrentMonth && setSelectedDay(item.key)}
              whileHover={item.isCurrentMonth ? { scale: 1.08 } : {}}
              whileTap={item.isCurrentMonth ? { scale: 0.95 } : {}}
              style={item.phase ? {
                '--day-bg': item.phase.config.bg,
                '--day-border': item.phase.config.color,
              } : {}}
            >
              <span className="cal-day-num">{item.day}</span>
              {item.phase && (
                <div className="cal-day-indicator" title={item.phase.label}>
                  <span className="cal-day-dot" style={{ background: item.phase.config.color }} />
                </div>
              )}
              {item.isToday && <div className="cal-today-ring" />}
            </motion.div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (() => {
        const sel = calendarDays.find(d => d.key === selectedDay);
        if (!sel || !sel.isCurrentMonth) return null;

        return (
          <motion.div
            className="cal-detail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedDay}
          >
            <div className="cal-detail-date">
              {new Date(year, month, sel.day).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {sel.phase ? (
              <div className="cal-detail-phase" style={{ color: sel.phase.config.color }}>
                <span>{sel.phase.config.emoji}</span>
                <span>{sel.phase.label}</span>
              </div>
            ) : (
              <div className="cal-detail-phase" style={{ color: 'var(--text-muted)' }}>
                No cycle data for this day
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Legend */}
      <div className="cal-legend">
        {Object.entries(PHASE_MAP).map(([key, val]) => (
          <div key={key} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: val.color }} />
            <span className="cal-legend-label">{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

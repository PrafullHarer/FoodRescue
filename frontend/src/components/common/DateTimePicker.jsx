import { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight,
  Check, Sparkles, X
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format a Date object to YYYY-MM-DDTHH:mm for state storage.
 */
export function formatToInputString(date) {
  if (!date || isNaN(new Date(date).getTime())) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Format string to human-readable format: "Oct 9, 2026 • 06:55 AM"
 */
export function formatDisplayDate(val) {
  if (!val) return 'Select date & time';
  const d = new Date(val);
  if (isNaN(d.getTime())) return 'Select date & time';

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today • ${timeStr}`;
  if (isTomorrow) return `Tomorrow • ${timeStr}`;

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${dateStr} • ${timeStr}`;
}

export default function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date & time',
  minDate,
  presets = [],
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parsed initial date
  const parsedDate = value ? new Date(value) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [currentMonth, setCurrentMonth] = useState(validDate.getMonth());
  const [currentYear, setCurrentYear] = useState(validDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(validDate.getDate());

  // 12-hour time state
  const initialHours24 = validDate.getHours();
  const initialAmPm = initialHours24 >= 12 ? 'PM' : 'AM';
  const initialHours12 = initialHours24 % 12 === 0 ? 12 : initialHours24 % 12;

  const [selectedHour, setSelectedHour] = useState(initialHours12);
  const [selectedMinute, setSelectedMinute] = useState(
    Math.round(validDate.getMinutes() / 5) * 5 % 60
  );
  const [selectedAmPm, setSelectedAmPm] = useState(initialAmPm);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        setSelectedDay(d.getDate());
        const h24 = d.getHours();
        setSelectedHour(h24 % 12 === 0 ? 12 : h24 % 12);
        setSelectedMinute(d.getMinutes());
        setSelectedAmPm(h24 >= 12 ? 'PM' : 'AM');
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const commitDateTime = (day, hour12, minute, ampm, month = currentMonth, year = currentYear) => {
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;

    const newDate = new Date(year, month, day, h24, minute, 0);
    const isoString = formatToInputString(newDate);
    onChange(isoString);
  };

  const applyPreset = (minutesToAdd) => {
    const target = new Date(Date.now() + minutesToAdd * 60000);
    const isoString = formatToInputString(target);
    onChange(isoString);
    setOpen(false);
  };

  const minutesList = [0, 15, 30, 45];
  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5 flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 text-sm font-medium cursor-pointer ${
          open
            ? 'border-neutral-900 bg-neutral-100 ring-2 ring-neutral-900/10 dark:border-white dark:bg-[#18181c] dark:ring-white/20 shadow-lg'
            : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-[#232328] dark:bg-[#0c0c0e] dark:hover:border-[#3f3f46] dark:hover:bg-[#141416]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-white flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className={value ? 'text-neutral-900 dark:text-white font-medium truncate' : 'text-neutral-500 truncate'}>
            {formatDisplayDate(value)}
          </span>
        </div>
        <Clock className="w-4 h-4 text-neutral-500 flex-shrink-0 ml-2" />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[360px] bg-white border border-neutral-200 dark:bg-[#121214] dark:border-[#26262e] rounded-2xl shadow-2xl p-4 text-neutral-900 dark:text-white animate-fade-in backdrop-blur-xl">
          {/* Quick Presets */}
          {presets && presets.length > 0 && (
            <div className="mb-3.5 pb-3 border-b border-neutral-200 dark:border-[#232328]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Quick Presets
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(p.minutes)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-900 hover:text-white dark:bg-[#1c1c20] dark:text-neutral-300 dark:hover:bg-white dark:hover:text-black border border-neutral-200 dark:border-[#2a2a32] transition-all cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 dark:hover:bg-[#202026] dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 dark:hover:bg-[#202026] dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-4">
            {DAYS.map((d) => (
              <span key={d} className="text-[10px] font-bold text-neutral-500 py-1">
                {d}
              </span>
            ))}

            {/* Empty slots for start of month */}
            {[...Array(firstDayOfWeek)].map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {/* Day buttons */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDay === day &&
                validDate.getMonth() === currentMonth &&
                validDate.getFullYear() === currentYear;

              const today = new Date();
              const isCurrentToday =
                today.getDate() === day &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    commitDateTime(day, selectedHour, selectedMinute, selectedAmPm);
                  }}
                  className={`h-7 w-7 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40 font-bold shadow-md'
                      : isCurrentToday
                      ? 'border border-neutral-900 text-neutral-900 dark:border-white/40 dark:text-white'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#202026] dark:hover:text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="pt-3 border-t border-neutral-200 dark:border-[#232328] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-700 dark:text-white" /> Time Selection
              </span>
              <span className="text-neutral-900 dark:text-white font-mono font-bold">
                {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')} {selectedAmPm}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center bg-neutral-100 dark:bg-[#0a0a0c] p-2.5 rounded-xl border border-neutral-200 dark:border-[#202026]">
              {/* Hour Select */}
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block mb-1 uppercase text-center">Hour</label>
                <select
                  value={selectedHour}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    setSelectedHour(h);
                    commitDateTime(selectedDay, h, selectedMinute, selectedAmPm);
                  }}
                  className="w-full bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-[#282830] text-neutral-900 dark:text-white text-xs font-bold rounded-lg p-1.5 text-center outline-none focus:border-neutral-900 dark:focus:border-white cursor-pointer"
                >
                  {hoursList.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Select */}
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block mb-1 uppercase text-center">Minute</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setSelectedMinute(m);
                    commitDateTime(selectedDay, selectedHour, m, selectedAmPm);
                  }}
                  className="w-full bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-[#282830] text-neutral-900 dark:text-white text-xs font-bold rounded-lg p-1.5 text-center outline-none focus:border-neutral-900 dark:focus:border-white cursor-pointer"
                >
                  {minutesList.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block mb-1 uppercase text-center">AM / PM</label>
                <div className="grid grid-cols-2 gap-1 bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-[#282830] rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAmPm('AM');
                      commitDateTime(selectedDay, selectedHour, selectedMinute, 'AM');
                    }}
                    className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      selectedAmPm === 'AM'
                        ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAmPm('PM');
                      commitDateTime(selectedDay, selectedHour, selectedMinute, 'PM');
                    }}
                    className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      selectedAmPm === 'PM'
                        ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-xl bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] font-bold text-xs hover:bg-neutral-800 dark:hover:bg-[#303038] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Date & Time</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

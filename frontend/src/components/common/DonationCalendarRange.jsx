"use client"

import * as React from "react"
import { addDays, format, isBefore, startOfToday } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react"

export function CalendarRange({
  dateRange,
  onDateRangeChange,
  className = "",
}) {
  const today = startOfToday()

  const [internalRange, setInternalRange] = React.useState(
    dateRange || {
      from: today,
      to: addDays(today, 1),
    }
  )

  const handleSelect = (range) => {
    setInternalRange(range)
    if (onDateRangeChange) {
      onDateRangeChange(range)
    }
  }

  return (
    <Card className={`bg-[#141416]/90 border border-[#232328] rounded-2xl shadow-xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-[#232328] flex items-center justify-between flex-wrap gap-2 bg-[#0c0c0e]/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Pickup & Availability Date Range
            </h4>
            <p className="text-[11px] text-neutral-400">
              Select the active window dates for shelter collection
            </p>
          </div>
        </div>

        {internalRange?.from && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1c1c20] border border-[#2e2e36] text-white">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              {format(internalRange.from, "LLL dd, yyyy")}
              {internalRange.to ? ` — ${format(internalRange.to, "LLL dd, yyyy")}` : ""}
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center">
        <Calendar
          mode="range"
          defaultMonth={internalRange?.from || today}
          selected={internalRange}
          onSelect={handleSelect}
          numberOfMonths={1}
          disabled={(date) => isBefore(date, today)}
          className="rounded-xl border border-[#232328] bg-[#0c0c0e] text-white p-3 shadow-md"
        />

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Shelters in your proximity will be notified of these collection dates.</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default CalendarRange;

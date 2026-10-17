import React from 'react';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import Button from '../../components/common/Button';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Common Team Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage schedules, client meetings, project deadlines, and assignments</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>New Event</Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <CalendarIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">FullCalendar Interactive View</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          FullCalendar integration with month, week, day views and team member event assignments will be connected in Phase 9.
        </p>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import calendarApi from '../../api/calendar.api';
import { useAuth } from '../../context/AuthContext';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATEGORY_COLORS = {
  general: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  meeting: 'bg-sky-50 text-sky-700 border-sky-200',
  deadline: 'bg-rose-50 text-rose-700 border-rose-200',
  leave: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-purple-50 text-purple-700 border-purple-200'
};
const EMPTY_FORM = {
  title: '', description: '', date: '', assignedTo: '', startTime: '', endTime: '',
  location: '', meetingUrl: '', category: 'general', repeat: 'none', repeatCount: 1, status: 'todo'
};

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonth(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatTaskDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getMonthGrid(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getViewDates(anchor, view) {
  if (view === 'month') return getMonthGrid(anchor);
  const first = new Date(anchor);
  if (view === 'week') first.setDate(first.getDate() - first.getDay());
  return Array.from({ length: view === 'day' ? 1 : 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function formatCalendarHeading(date, view) {
  if (view === 'day') return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (view === 'week') {
    const last = new Date(date);
    last.setDate(last.getDate() + 6);
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return formatMonth(date);
}

function CalendarTask({ event, onStatusChange, onEdit, onDelete, canDelete }) {
  const statusLabel = event.status === 'done' ? 'Completed' : event.status === 'in_progress' ? 'In progress' : 'To do';
  const categoryBadge = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.general;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <button
        type="button"
        onClick={() => onStatusChange(event, event.status === 'done' ? 'todo' : 'done')}
        className={`mt-0.5 shrink-0 rounded-full ${event.status === 'done' ? 'text-emerald-600' : 'text-slate-300 hover:text-indigo-600'}`}
        aria-label={event.status === 'done' ? `Mark ${event.title} as to do` : `Mark ${event.title} as completed`}
        title={event.status === 'done' ? 'Mark as to do' : 'Mark as completed'}
      >
        <CircleCheck className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-medium ${event.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {event.title}
          </p>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${categoryBadge}`}>
            {event.category || 'general'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {event.assignedTo?.name || 'Unknown assignee'} · {statusLabel}
        </p>
        {(event.startTime || event.location) && <p className="mt-1 text-xs text-slate-500">{[event.startTime && `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}`, event.location].filter(Boolean).join(' · ')}</p>}
        {event.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{event.description}</p>}
        {event.meetingUrl && <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-indigo-600 hover:underline">Join meeting</a>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(event)}
          aria-label={`Edit ${event.title}`}
          title="Edit event"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(event)}
            aria-label={`Delete ${event.title}`}
            title="Delete event"
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const gridDates = useMemo(() => getViewDates(month, view), [month, view]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(gridDates[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(gridDates[gridDates.length - 1]);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);
      const [eventResponse, assigneeResponse] = await Promise.all([
        calendarApi.getEvents({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
        calendarApi.getAssignees()
      ]);
      setEvents(eventResponse.data.events);
      setAssignees(assigneeResponse.data.assignees);
    } catch (error) {
      showToast(error.message || 'Could not load calendar tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [gridDates, showToast]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const eventsByDay = useMemo(() => events.reduce((days, event) => {
    const key = dateKey(new Date(event.date));
    days[key] = [...(days[key] || []), event];
    return days;
  }, {}), [events]);

  const openCreateDialog = (date = new Date()) => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, date: dateKey(date), assignedTo: assignees[0]?._id || '' });
    setModalOpen(true);
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: dateKey(new Date(event.date)),
      assignedTo: event.assignedTo?._id || event.assignedTo || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      meetingUrl: event.meetingUrl || '',
      category: event.category || 'general',
      repeat: 'none',
      repeatCount: 1,
      status: event.status || 'todo'
    });
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingEvent) {
        await calendarApi.updateEvent(editingEvent._id, {
          title: form.title,
          description: form.description,
          date: new Date(`${form.date}T12:00:00`).toISOString(),
          assignedTo: form.assignedTo,
          startTime: form.startTime,
          endTime: form.endTime,
          location: form.location,
          meetingUrl: form.meetingUrl,
          category: form.category,
          status: form.status
        });
        showToast('Task updated successfully.', 'success');
      } else {
        const { status: _unusedStatus, ...createPayload } = form;
        await calendarApi.createEvent({
          ...createPayload,
          repeatCount: Number(form.repeatCount),
          date: new Date(`${form.date}T12:00:00`).toISOString()
        });
        showToast(form.repeat === 'none' ? 'Task assigned successfully.' : `${form.repeatCount} recurring tasks assigned.`, 'success');
      }
      setModalOpen(false);
      setEditingEvent(null);
      await loadCalendar();
    } catch (error) {
      showToast(error.message || 'Could not save task.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (event, status) => {
    try {
      await calendarApi.updateEvent(event._id, { status });
      setEvents((current) => current.map((item) => item._id === event._id ? { ...item, status } : item));
    } catch (error) {
      showToast(error.message || 'Could not update task status.', 'error');
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try {
      await calendarApi.deleteEvent(event._id);
      setEvents((current) => current.filter((item) => item._id !== event._id));
      showToast('Task deleted.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not delete task.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Calendar</h1>
          <p className="mt-0.5 text-sm text-slate-500">Schedule tasks and assign them to active team members.</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => openCreateDialog()}>Assign task</Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Team task calendar">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">{formatCalendarHeading(gridDates[0], view)}</h2>
          <div className="flex items-center gap-2">
            <select aria-label="Calendar view" value={view} onChange={(event) => setView(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
              <option value="month">Month</option><option value="week">Week</option><option value="day">Day</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
            <button type="button" onClick={() => { if (view === 'month') setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); else { const next = new Date(month); next.setDate(next.getDate() + (view === 'week' ? -7 : -1)); setMonth(next); } }} aria-label="Previous period" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { if (view === 'month') setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); else { const next = new Date(month); next.setDate(next.getDate() + (view === 'week' ? 7 : 1)); setMonth(next); } }} aria-label="Next period" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view !== 'day' && <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {(view === 'month' ? WEEKDAYS : WEEKDAYS.map((_, index) => {
            const date = gridDates[index];
            return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          })).map((day) => <div key={day} className="py-2 text-center text-xs font-semibold uppercase text-slate-500">{day}</div>)}
        </div>}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
            <Clock3 className="mr-2 h-4 w-4 animate-pulse" /> Loading tasks…
          </div>
        ) : (
          <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
            {gridDates.map((date) => {
              const key = dateKey(date);
              const dayEvents = eventsByDay[key] || [];
              const isCurrentMonth = view !== 'month' || date.getMonth() === month.getMonth();
              const isToday = key === dateKey(new Date());
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => openCreateDialog(date)}
                  aria-label={`Add task on ${date.toLocaleDateString()}`}
                  className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-indigo-50/50 sm:min-h-28 sm:p-2 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-indigo-600 font-semibold text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                    {date.getDate()}
                  </span>
                  <span className="mt-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((item) => {
                      const pillColor = item.status === 'done'
                        ? 'bg-emerald-50 text-emerald-700'
                        : CATEGORY_COLORS[item.category] || 'bg-indigo-50 text-indigo-700';
                      return (
                        <span key={item._id} className={`truncate rounded px-1 py-0.5 text-[10px] sm:text-xs ${pillColor}`}>
                          {item.startTime ? `${item.startTime} ${item.title}` : item.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 2 && <span className="px-1 text-[10px] text-slate-500">+{dayEvents.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">Calendar agenda</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{events.length}</span>
        </div>
        {events.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {events.map((event) => (
              <div key={event._id} className="relative">
                <p className="mb-1 ml-1 text-xs font-medium text-slate-500">{formatTaskDate(event.date)}</p>
                <CalendarTask event={event} onStatusChange={handleStatusChange} onEdit={openEditDialog} onDelete={handleDelete} canDelete={isAdmin} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">No tasks scheduled for this month</p>
            <p className="mt-1 text-xs text-slate-500">Choose a date or assign a task to get started.</p>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingEvent(null); }} title={editingEvent ? 'Edit task' : 'Assign a task'} subtitle="Choose a date and team member for this task.">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Task title"
            name="task-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="e.g. Prepare project proposal"
            maxLength={160}
            required
          />
          <Input
            label="Description"
            name="task-description"
            type="textarea"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Add details (optional)"
            rows={3}
            maxLength={2000}
          />
          <Input
            label="Due date"
            name="task-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time (optional)" name="task-start-time" type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
            <Input label="End time (optional)" name="task-end-time" type="time" min={form.startTime || undefined} value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="task-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Category</label><select id="task-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{['general', 'meeting', 'deadline', 'leave', 'other'].map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></div>
            <Input label="Location" name="task-location" maxLength={300} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
          </div>
          <Input label="Meeting link (optional)" name="task-meeting-url" type="url" value={form.meetingUrl} onChange={(event) => setForm((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="https://" />
          {!editingEvent ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="task-repeat" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Repeat</label><select id="task-repeat" value={form.repeat} onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
              {form.repeat !== 'none' && <Input label="Occurrences (max 52)" name="task-repeat-count" type="number" min="2" max="52" required value={form.repeatCount} onChange={(event) => setForm((current) => ({ ...current, repeatCount: event.target.value }))} />}
            </div>
          ) : (
            <div><label htmlFor="task-status" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Status</label><select id="task-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></div>
          )}
          <div>
            <label htmlFor="task-assignee" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Assign to <span className="text-rose-500">*</span></label>
            <select
              id="task-assignee"
              value={form.assignedTo}
              onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>Select a team member</option>
              {assignees.map((assignee) => (
                <option key={assignee._id} value={assignee._id}>{assignee.name}{assignee.designation ? ` — ${assignee.designation}` : ''}</option>
              ))}
            </select>
            {!assignees.length && <p className="mt-1 text-xs text-rose-600">No active team members are available to assign.</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingEvent(null); }}>Cancel</Button>
            <Button type="submit" isLoading={saving} disabled={!assignees.length || (form.startTime && form.endTime && form.endTime <= form.startTime)}>{editingEvent ? 'Save changes' : 'Assign task'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

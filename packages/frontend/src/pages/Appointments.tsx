import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Textarea, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Calendar as CalendarIcon, List, Plus, Trash2, Send, Clock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale';

// Setup react-big-calendar localizer
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const appointmentSchema = zod.object({
  patientId: zod.string().min(1, 'Patient selection is required'),
  providerId: zod.string().optional(),
  dateTime: zod.string().min(1, 'Date and time is required'),
  duration: zod.string().min(1, 'Duration is required'),
  type: zod.string().min(2, 'Treatment type is required'),
  notes: zod.string().optional(),
  status: zod.string().optional(),
});

type AppointmentFormInputs = zod.infer<typeof appointmentSchema>;

const APPT_TYPES = [
  { value: 'checkup', label: 'Checkup & Consultation' },
  { value: 'filling', label: 'Dental Filling' },
  { value: 'cleaning', label: 'Hygiene & Cleaning' },
  { value: 'ortho', label: 'Orthodontics & Braces' },
  { value: 'root-canal', label: 'Root Canal Therapy' },
  { value: 'crown', label: 'Crowns & Veneers' },
];

const APPT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

export default function Appointments() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<any>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<any | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', selectedProviderId],
    queryFn: async () => {
      const url = selectedProviderId ? `/api/appointments?providerId=${selectedProviderId}` : '/api/appointments';
      const { data } = await api.get(url);
      return data;
    },
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-simple'],
    queryFn: async () => {
      const { data } = await api.get('/api/patients?limit=100');
      return data.patients;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data } = await api.get('/api/providers');
      return data;
    },
  });

  const { register: registerAdd, handleSubmit: handleSubmitAdd, reset: resetAdd, formState: { errors: errorsAdd } } = useForm<AppointmentFormInputs>({
    resolver: zodResolver(appointmentSchema),
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, setValue: setEditValue, formState: { errors: errorsEdit } } = useForm<AppointmentFormInputs>({
    resolver: zodResolver(appointmentSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/appointments', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Appointment booked successfully.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setAddModalOpen(false);
      resetAdd();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create appointment.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/api/appointments/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Appointment details updated.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setEditAppt(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update appointment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast.success('Appointment cancelled and removed.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete appointment.'),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/appointments/${id}/send-reminder`);
      return data;
    },
    onSuccess: () => toast.success('Reminder message queued successfully.'),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to trigger reminder.'),
  });

  const handleEditClick = (appt: any) => {
    setEditAppt(appt);
    setEditValue('patientId', appt.patientId);
    setEditValue('providerId', appt.providerId || '');
    setEditValue('dateTime', appt.dateTime ? appt.dateTime.slice(0, 16) : '');
    setEditValue('duration', appt.duration.toString());
    setEditValue('type', appt.type);
    setEditValue('status', appt.status);
    setEditValue('notes', appt.notes || '');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'CONFIRMED': return 'primary';
      case 'CANCELLED': return 'neutral';
      case 'NO_SHOW': return 'danger';
      default: return 'warning';
    }
  };

  // Prepare events for react-big-calendar
  const events = (appointments || []).map((appt: any) => {
    const start = new Date(appt.dateTime);
    const end = new Date(start.getTime() + appt.duration * 60000);
    return {
      id: appt.id,
      title: `${appt.patient?.firstName} ${appt.patient?.lastName} - ${appt.type}`,
      start,
      end,
      resource: appt,
      providerColor: appt.provider?.color || '#475569',
    };
  });

  const eventStyleGetter = (event: any) => {
    const style = {
      backgroundColor: event.providerColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '0.75rem',
    };
    return { style };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Appointment Schedule
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage provider schedules and patient bookings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 px-3 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-primary-500"
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(e.target.value)}
          >
            <option value="">All Providers</option>
            {(providers || []).map((p: any) => (
              <option key={p.id} value={p.id}>Dr. {p.lastName}</option>
            ))}
          </select>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1 h-9 items-center">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => { resetAdd(); setAddModalOpen(true); }} className="h-9 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Book Appointment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : viewMode === 'calendar' ? (
        <Card className="h-[750px] p-4 bg-slate-900/40 border border-slate-800">
          <style dangerouslySetInnerHTML={{__html: `
            .rbc-calendar { font-family: inherit; color: #cbd5e1; }
            .rbc-toolbar button { color: #cbd5e1; border-color: #334155; }
            .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background-color: #0ea5e9; color: white; border-color: #0ea5e9; }
            .rbc-header { border-bottom: 1px solid #334155; padding: 8px 0; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: #334155; border-radius: 8px; overflow: hidden; background: rgba(15,23,42,0.6); }
            .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #334155; }
            .rbc-month-row + .rbc-month-row { border-top: 1px solid #334155; }
            .rbc-time-content { border-top: 1px solid #334155; }
            .rbc-time-slot { border-top: 1px solid rgba(51, 65, 85, 0.4); }
            .rbc-time-header-content { border-left: 1px solid #334155; }
            .rbc-timeslot-group { border-bottom: 1px solid #334155; }
            .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(51, 65, 85, 0.5); }
            .rbc-today { background-color: rgba(14, 165, 233, 0.1); }
            .rbc-off-range-bg { background-color: rgba(15, 23, 42, 0.8); }
            .rbc-event { box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1) !important; padding: 2px 5px; }
            .rbc-event:hover { opacity: 1 !important; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 50; }
            .rbc-event-content { font-size: 0.7rem; font-weight: 500; }
            .rbc-time-view .rbc-allday-cell { background: rgba(15,23,42,0.8); border-bottom: 1px solid #334155; }
          `}} />
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={calendarView}
            onView={setCalendarView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={(event) => handleEditClick(event.resource)}
            onSelectSlot={(slotInfo) => {
              resetAdd();
              setAddModalOpen(true);
              const { register } = useForm();
              // Try to set start date automatically if possible
            }}
            selectable
            eventPropGetter={eventStyleGetter}
            step={15}
            timeslots={4}
            min={new Date(0, 0, 0, 7, 0, 0)} // 7 AM
            max={new Date(0, 0, 0, 19, 0, 0)} // 7 PM
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-6">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(appointments || []).map((appt: any) => (
                  <tr key={appt.id} className="hover:bg-slate-900/15">
                    <td className="py-3 px-6 font-semibold text-slate-200">
                      {format(new Date(appt.dateTime), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {appt.patient?.firstName} {appt.patient?.lastName}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {appt.provider ? `Dr. ${appt.provider.lastName}` : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-400">{appt.type}</td>
                    <td className="py-3 px-4">
                      <Badge color={getStatusBadgeColor(appt.status)}>{appt.status}</Badge>
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditClick(appt)}>
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (confirm('Cancel appointment?')) deleteMutation.mutate(appt.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-danger-500 hover:text-danger-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Book Appointment Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Book Appointment">
        <form onSubmit={handleSubmitAdd((data) => createMutation.mutate(data))} className="space-y-4">
          <Select label="Select Patient" options={[{ value: '', label: 'Choose...' }, ...(patients || []).map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))]} error={errorsAdd.patientId?.message} {...registerAdd('patientId')} />
          <Select label="Assign Provider" options={[{ value: '', label: 'Any Provider' }, ...(providers || []).map((p: any) => ({ value: p.id, label: `Dr. ${p.firstName} ${p.lastName}` }))]} {...registerAdd('providerId')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date & Time" type="datetime-local" error={errorsAdd.dateTime?.message} {...registerAdd('dateTime')} />
            <Input label="Duration (min)" type="number" placeholder="30" error={errorsAdd.duration?.message} {...registerAdd('duration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Treatment Type" options={APPT_TYPES} error={errorsAdd.type?.message} {...registerAdd('type')} />
            <Select label="Status" options={APPT_STATUSES} {...registerAdd('status')} />
          </div>
          <Textarea label="Treatment Notes" placeholder="Add notes here..." error={errorsAdd.notes?.message} {...registerAdd('notes')} />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Book Appointment</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal isOpen={editAppt !== null} onClose={() => setEditAppt(null)} title="Update Appointment">
        <form onSubmit={handleSubmitEdit((data) => { if (editAppt) updateMutation.mutate({ id: editAppt.id, payload: data }); })} className="space-y-4">
          <Select label="Patient" disabled options={[...(patients || []).map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))]} {...registerEdit('patientId')} />
          <Select label="Assign Provider" options={[{ value: '', label: 'Any Provider' }, ...(providers || []).map((p: any) => ({ value: p.id, label: `Dr. ${p.firstName} ${p.lastName}` }))]} {...registerEdit('providerId')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date & Time" type="datetime-local" error={errorsEdit.dateTime?.message} {...registerEdit('dateTime')} />
            <Input label="Duration (min)" type="number" error={errorsEdit.duration?.message} {...registerEdit('duration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Treatment Type" options={APPT_TYPES} error={errorsEdit.type?.message} {...registerEdit('type')} />
            <Select label="Status" options={APPT_STATUSES} {...registerEdit('status')} />
          </div>
          <Textarea label="Treatment Notes" error={errorsEdit.notes?.message} {...registerEdit('notes')} />

          <div className="flex justify-between items-center pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" size="sm" onClick={() => sendReminderMutation.mutate(editAppt.id)} isLoading={sendReminderMutation.isPending}>
              <Send className="h-3 w-3 mr-1" /> Send Reminder
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => setEditAppt(null)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

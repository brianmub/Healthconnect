import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Textarea, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  Clock,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';

// Appointment Validation Schema
const appointmentSchema = zod.object({
  patientId: zod.string().min(1, 'Patient selection is required'),
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
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<any | null>(null);

  // Queries
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments');
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

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<AppointmentFormInputs>({
    resolver: zodResolver(appointmentSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    formState: { errors: errorsEdit },
  } = useForm<AppointmentFormInputs>({
    resolver: zodResolver(appointmentSchema),
  });

  // Mutations
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
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create appointment.');
    },
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
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update appointment.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast.success('Appointment cancelled and removed.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete appointment.');
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/appointments/${id}/send-reminder`);
      return data;
    },
    onSuccess: () => {
      toast.success('Reminder message queued successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to trigger reminder.');
    },
  });

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 (Sunday) to 6 (Saturday)

  // Empty cells before start of month
  const blanks = Array(startDayOfWeek).fill(null);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleEditClick = (appt: any) => {
    setEditAppt(appt);
    setEditValue('patientId', appt.patientId);
    setEditValue('dateTime', appt.dateTime ? appt.dateTime.slice(0, 16) : '');
    setEditValue('duration', appt.duration.toString());
    setEditValue('type', appt.type);
    setEditValue('status', appt.status);
    setEditValue('notes', appt.notes || '');
  };

  const handleCreateSubmit = (data: AppointmentFormInputs) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: AppointmentFormInputs) => {
    if (!editAppt) return;
    updateMutation.mutate({ id: editAppt.id, payload: data });
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

  const getApptTypeColor = (type: string) => {
    switch (type) {
      case 'checkup': return 'border-l-4 border-l-primary-500';
      case 'filling': return 'border-l-4 border-l-warning-500';
      case 'cleaning': return 'border-l-4 border-l-success-500';
      case 'ortho': return 'border-l-4 border-l-sky-400';
      default: return 'border-l-4 border-l-slate-600';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Appointment Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Book checkups, update patient arrival statuses, and dispatch quick reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1 h-9 items-center">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)} className="h-9 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Book Appointment
          </Button>
        </div>
      </div>

      {/* Main schedule layout */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8" />
          <span className="text-xs text-slate-500">Loading schedules...</span>
        </div>
      ) : viewMode === 'calendar' ? (
        /* ==========================================
            CALENDAR VIEW
            ========================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-800">
            <h2 className="text-md font-bold text-slate-200">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Week header */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 border-b border-slate-800/80 bg-slate-900/40 py-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 grid-rows-5 divide-x divide-y divide-slate-800/60 bg-slate-950/10 min-h-[480px]">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="bg-slate-950/20 min-h-[80px]" />
              ))}
              {monthDays.map((day) => {
                const dayAppts = (appointments || []).filter((a: any) =>
                  isSameDay(new Date(a.dateTime), day)
                );

                return (
                  <div
                    key={day.toString()}
                    className="p-1 min-h-[90px] flex flex-col justify-between hover:bg-slate-900/10 group transition-all"
                  >
                    <span className="text-[11px] font-bold text-slate-500 self-end p-1">{format(day, 'd')}</span>
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px]">
                      {dayAppts.map((appt: any) => (
                        <div
                          key={appt.id}
                          onClick={() => handleEditClick(appt)}
                          className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer truncate transition-all ${getApptTypeColor(
                            appt.type
                          )} bg-slate-900/60 border border-slate-800/80 text-slate-300 hover:bg-slate-800`}
                        >
                          {format(new Date(appt.dateTime), 'h:mma')} {appt.patient?.lastName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================
            LIST VIEW
            ========================================== */
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-6">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reminder</th>
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
                    <td className="py-3 px-4 capitalize text-slate-400">{appt.type}</td>
                    <td className="py-3 px-4 text-slate-400">{appt.duration} Min</td>
                    <td className="py-3 px-4">
                      <Badge color={getStatusBadgeColor(appt.status)}>{appt.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {!appt.patient?.optedOut ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2.5 text-[10px] bg-slate-900 hover:bg-primary-500 border-slate-800/80 hover:text-white"
                          onClick={() => sendReminderMutation.mutate(appt.id)}
                          isLoading={sendReminderMutation.isPending && sendReminderMutation.variables === appt.id}
                        >
                          <Send className="h-3 w-3 mr-1" /> Remind
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-semibold">Opted Out</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditClick(appt)}>
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          if (confirm('Cancel and delete appointment?')) {
                            deleteMutation.mutate(appt.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger-500 hover:text-danger-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(appointments || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No appointments booked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* Book Appointment Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Book Appointment">
        <form onSubmit={handleSubmitAdd(handleCreateSubmit)} className="space-y-4">
          <Select
            label="Select Patient"
            options={[
              { value: '', label: 'Choose a patient...' },
              ...(patients || []).map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName} (${p.phone})` })),
            ]}
            error={errorsAdd.patientId?.message}
            {...registerAdd('patientId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Appointment Date & Time" type="datetime-local" error={errorsAdd.dateTime?.message} {...registerAdd('dateTime')} />
            <Input label="Duration (minutes)" type="number" placeholder="30" error={errorsAdd.duration?.message} {...registerAdd('duration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Treatment Type" options={APPT_TYPES} error={errorsAdd.type?.message} {...registerAdd('type')} />
            <Select label="Status" options={APPT_STATUSES} {...registerAdd('status')} />
          </div>
          <Textarea label="Treatment Notes (Optional)" placeholder="Add notes here..." error={errorsAdd.notes?.message} {...registerAdd('notes')} />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Book Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal isOpen={editAppt !== null} onClose={() => setEditAppt(null)} title="Update Appointment Details">
        <form onSubmit={handleSubmitEdit(handleEditSubmit)} className="space-y-4">
          <Select
            label="Patient"
            disabled
            options={[
              ...(patients || []).map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
            ]}
            error={errorsEdit.patientId?.message}
            {...registerEdit('patientId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Appointment Date & Time" type="datetime-local" error={errorsEdit.dateTime?.message} {...registerEdit('dateTime')} />
            <Input label="Duration (minutes)" type="number" error={errorsEdit.duration?.message} {...registerEdit('duration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Treatment Type" options={APPT_TYPES} error={errorsEdit.type?.message} {...registerEdit('type')} />
            <Select label="Status" options={APPT_STATUSES} {...registerEdit('status')} />
          </div>
          <Textarea label="Treatment Notes" error={errorsEdit.notes?.message} {...registerEdit('notes')} />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditAppt(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

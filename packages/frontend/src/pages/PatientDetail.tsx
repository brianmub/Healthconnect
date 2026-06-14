import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Spinner } from '../components/ui';
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Tag,
  Cake
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const toggleOptOutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/patients/${id}/opt-out`);
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle preference.');
    },
  });

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8" />
        <span className="text-xs text-slate-500">Retrieving patient record...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-danger-500" />
        <div>
          <h3 className="text-lg font-bold text-slate-200">Patient Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">The requested patient record could not be located.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Database
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link to="/patients" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Database
        </Link>
      </div>

      {/* Profile summary card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 space-y-6">
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800/60">
            <div className="h-16 w-16 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/20 text-xl font-bold text-primary-400 uppercase mb-4">
              {patient.firstName.substring(0, 1)}
              {patient.lastName.substring(0, 1)}
            </div>
            <h2 className="text-lg font-bold text-slate-200">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {patient.tags?.map((t: any) => (
                <span key={t.id} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5" /> {t.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Demographic & Preferences</h4>
            <div className="flex items-center gap-3 text-slate-300">
              <Phone className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-mono">{patient.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="truncate">{patient.email || 'No email address'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Cake className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                {patient.dateOfBirth
                  ? `${format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')} (${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} y/o)`
                  : 'Birth date not set'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
              <span className="text-slate-400">Subscription Preferred</span>
              <Button
                variant={patient.optedOut ? 'danger' : 'success'}
                size="sm"
                className="py-1 px-2.5 h-7 text-[10px]"
                onClick={() => toggleOptOutMutation.mutate()}
                isLoading={toggleOptOutMutation.isPending}
              >
                {patient.optedOut ? 'Opted Out' : 'Active'}
              </Button>
            </div>
          </div>
        </Card>

        {/* History details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment History */}
          <Card>
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-500" />
              Appointment Records
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                    <th className="py-2.5 pb-2">Schedule Date</th>
                    <th className="py-2.5 pb-2">Treatment Type</th>
                    <th className="py-2.5 pb-2">Duration</th>
                    <th className="py-2.5 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {patient.appointments?.map((appt: any) => (
                    <tr key={appt.id} className="hover:bg-slate-900/10">
                      <td className="py-3 font-semibold text-slate-300">
                        {format(new Date(appt.dateTime), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="py-3 text-slate-400 capitalize">{appt.type}</td>
                      <td className="py-3 text-slate-400">{appt.duration} Min</td>
                      <td className="py-3">
                        <Badge
                          color={
                            appt.status === 'COMPLETED'
                              ? 'success'
                              : appt.status === 'CONFIRMED'
                              ? 'primary'
                              : appt.status === 'CANCELLED'
                              ? 'neutral'
                              : appt.status === 'NO_SHOW'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {appt.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!patient.appointments || patient.appointments.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No appointments found for this patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Outbound Messaging Logs */}
          <Card>
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-success-500" />
              Messaging Activity Logs
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {patient.messageRecipients?.map((msg: any) => (
                <div key={msg.id} className="p-3 bg-slate-900/20 border border-slate-850 rounded-lg flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-slate-300 font-semibold text-xs">
                      {msg.campaign?.name || 'Automated Action'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono text-[11px] leading-relaxed italic">
                      "{msg.campaign?.template?.body?.substring(0, 100)}..."
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="font-semibold">{msg.campaign?.channel || 'SMS'}</span>
                      {msg.sentAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(msg.sentAt), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      color={
                        msg.status === 'DELIVERED' || msg.status === 'SENT'
                          ? 'success'
                          : msg.status === 'FAILED'
                          ? 'danger'
                          : 'warning'
                      }
                      className="text-[9px]"
                    >
                      {msg.status}
                    </Badge>
                    {msg.failReason && (
                      <p className="text-[9px] text-danger-400 mt-1 max-w-[120px] truncate" title={msg.failReason}>
                        {msg.failReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!patient.messageRecipients || patient.messageRecipients.length === 0) && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No messaging activity logs recorded.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

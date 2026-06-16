import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Spinner } from '../components/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Send,
  CheckCircle2,
  Calendar,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#0ea5e9', '#64748b'];

export default function Dashboard() {
  const queryClient = useQueryClient();

  // Queries
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/overview');
      return data;
    }
  });

  const { data: messagesOverTime, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics-messages-over-time'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/messages-over-time');
      return data;
    }
  });

  const { data: deliveryRates, isLoading: deliveryRatesLoading } = useQuery({
    queryKey: ['analytics-delivery-rates'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/delivery-rates');
      return data;
    }
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/api/campaigns');
      return data;
    }
  });

  const { data: appointments, isLoading: apptsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments');
      // Sort upcoming and filter to scheduled/confirmed
      return data
        .filter((a: any) => new Date(a.dateTime) >= new Date() && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED'))
        .slice(0, 10);
    }
  });

  // Reuse the same query key as AppLayout so it shares the cache (no extra request)
  const { data: balanceData } = useQuery({
    queryKey: ['sms-balance'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings/sms/balance');
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
  const smsCredits: number | null = balanceData?.sms_credits ?? null;

  // Quick reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (apptId: string) => {
      const { data } = await api.post(`/api/appointments/${apptId}/send-reminder`);
      return data;
    },
    onSuccess: () => {
      toast.success('Quick reminder sent successfully.');
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to send quick reminder.';
      toast.error(msg);
    }
  });

  const isLoading = overviewLoading || chartLoading || deliveryRatesLoading || campaignsLoading || apptsLoading;

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-10 h-10" />
        <p className="text-slate-400 text-sm animate-pulse">Loading dashboard overview...</p>
      </div>
    );
  }

  // Pre-process delivery data
  const pieData = (deliveryRates || []).map((item: any) => ({
    name: item.name.toUpperCase(),
    value: item.value,
  }));

  const totalPieValues = pieData.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor practice messaging performance and patient communication alerts.
        </p>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-3xl font-bold text-slate-200 mt-2">{overview?.totalPatients ?? 0}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary-500" />
              Active patient listings
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
            <Users className="h-6 w-6" />
          </div>
        </Card>

        {/* KPI 2 */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent Today</p>
            <h3 className="text-3xl font-bold text-slate-200 mt-2">{overview?.messagesSentToday ?? 0}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-success-500" />
              SMS & WhatsApp alerts
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-500">
            <Send className="h-6 w-6" />
          </div>
        </Card>

        {/* KPI 3 */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Rate</p>
            <h3 className="text-3xl font-bold text-slate-200 mt-2">{overview?.deliveryRate ?? 100}%</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary-500" />
              Network delivery success
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>

        {/* KPI 4 */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Reminders</p>
            <h3 className="text-3xl font-bold text-slate-200 mt-2">{overview?.upcomingAppointments ?? 0}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-warning-500" />
              Next 7 days appointments
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-500">
            <Calendar className="h-6 w-6" />
          </div>
        </Card>

        {/* KPI 5 – SMS Credits */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SMS Credits</p>
            <h3 className={`text-3xl font-bold mt-2 ${
              smsCredits === null ? 'text-slate-500' : smsCredits >= 100 ? 'text-emerald-400' : smsCredits >= 20 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {smsCredits !== null ? smsCredits.toLocaleString() : '—'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-primary-500" />
              {smsCredits === null ? 'SMS Localhost not active' : smsCredits < 20 ? 'Low — top up soon!' : 'Remaining balance'}
            </p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
            smsCredits === null
              ? 'bg-slate-800/40 border-slate-700/30 text-slate-500'
              : smsCredits >= 100
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : smsCredits >= 20
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <CreditCard className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Messages Over Time */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-slate-200">Outbound Message Trends</h4>
              <p className="text-xs text-slate-500">Daily breakdown of sent messages (last 30 days)</p>
            </div>
            <Badge color="primary">Active Gateway</Badge>
          </div>
          <div className="h-72">
            {messagesOverTime && messagesOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={messagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(str) => {
                    try { return format(new Date(str), 'MMM d'); } catch { return str; }
                  }} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="SMS" stroke="#0ea5e9" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="WHATSAPP" stroke="#10b981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No messaging traffic logged in the last 30 days.
              </div>
            )}
          </div>
        </Card>

        {/* Donut Chart: Delivery Status */}
        <Card>
          <div className="mb-6">
            <h4 className="text-base font-bold text-slate-200">Delivery Distribution</h4>
            <p className="text-xs text-slate-500">Global outbound status breakdown</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {totalPieValues > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs text-center">No messages dispatched yet.</div>
            )}
            {totalPieValues > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-100">{totalPieValues}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Sent</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-4 text-xs font-semibold text-slate-400">
            {pieData.map((item: any, i: number) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 4. Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-200">Recent Campaigns</h4>
              <p className="text-xs text-slate-500">Summary of the latest communications</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')} className="text-xs text-primary-400 hover:text-primary-300">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 pb-2">Campaign Name</th>
                  <th className="py-2.5 pb-2">Channel</th>
                  <th className="py-2.5 pb-2">Recipients</th>
                  <th className="py-2.5 pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(campaigns || []).slice(0, 5).map((campaign: any) => (
                  <tr key={campaign.id} className="hover:bg-slate-900/20 transition-all">
                    <td className="py-3 font-semibold text-slate-300 max-w-[150px] truncate">{campaign.name}</td>
                    <td className="py-3 text-slate-400">{campaign.channel}</td>
                    <td className="py-3 text-slate-400">{campaign._count?.recipients ?? campaign.recipients?.length ?? 0}</td>
                    <td className="py-3">
                      <Badge
                        color={
                          campaign.status === 'SENT'
                            ? 'success'
                            : campaign.status === 'SCHEDULED'
                            ? 'primary'
                            : campaign.status === 'DRAFT'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(campaigns || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No campaigns created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upcoming appointments list */}
        <Card>
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-200">Upcoming Appointments</h4>
              <p className="text-xs text-slate-500">Checkups and quick notification alerts</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')} className="text-xs text-primary-400 hover:text-primary-300">
              View Calendar <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto pr-1">
            {(appointments || []).map((appt: any) => (
              <div key={appt.id} className="py-3 flex items-center justify-between gap-3 group">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-slate-200 truncate">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Badge color="primary" className="py-0 px-1.5 text-[9px]">{appt.type}</Badge>
                    <span>{format(new Date(appt.dateTime), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {appt.patient.optedOut ? (
                    <span className="text-[10px] text-slate-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-3 w-3" /> Opted Out
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="px-2 py-1 text-[10px] h-7 bg-slate-900 border-slate-800/80 hover:bg-primary-500 hover:text-white hover:border-transparent opacity-80 group-hover:opacity-100 transition-all"
                      onClick={() => sendReminderMutation.mutate(appt.id)}
                      isLoading={sendReminderMutation.isPending && sendReminderMutation.variables === appt.id}
                    >
                      Remind
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(appointments || []).length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No upcoming appointments scheduled in the next 7 days.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

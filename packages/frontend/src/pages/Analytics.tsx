import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Spinner, Select } from '../components/ui';
import {
  BarChart,
  Bar,
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
  TrendingUp,
  BarChart3,
  Calendar,
  MessageSquare,
  Users,
  Award
} from 'lucide-react';
import { format } from 'date-fns';

const PIE_COLORS = ['#0ea5e9', '#10b981', '#ef4444', '#f59e0b', '#64748b'];

export default function Analytics() {
  const [range, setRange] = useState('30');

  // Queries
  const { data: messagesOverTime, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics-messages-over-time', range],
    queryFn: async () => {
      const { data } = await api.get(`/api/analytics/messages-over-time?range=${range}`);
      return data;
    }
  });

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['analytics-campaign-performance'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/campaign-performance');
      return data;
    }
  });

  const isLoading = chartLoading || perfLoading;

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8" />
        <span className="text-xs text-slate-500">Compiling analytics report...</span>
      </div>
    );
  }

  // Preprocess campaigns performance data
  const campaignData = (perfData?.campaigns || []).slice(0, 8);

  // Preprocess templates ranking
  const topTemplates = (perfData?.templates || []).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            System Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze delivery metrics, channel breakdowns, and campaign efficiency.
          </p>
        </div>
        <div className="w-40">
          <Select
            options={[
              { value: '7', label: 'Last 7 Days' },
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
            ]}
            className="h-9 py-1"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          />
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 border border-primary-500/20 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Top Performing Channel</span>
            <p className="text-xl font-bold text-slate-200 mt-1">WhatsApp Business</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success-500/10 flex items-center justify-center text-success-400 border border-success-500/20 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Avg Success Rate</span>
            <p className="text-xl font-bold text-slate-200 mt-1">94.8%</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning-500/10 flex items-center justify-center text-warning-400 border border-warning-500/20 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Global Opt-Out Rate</span>
            <p className="text-xl font-bold text-slate-200 mt-1">{perfData?.optOutTrend?.rate ?? 0}%</p>
          </div>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Traffic chart */}
        <Card>
          <div className="mb-4">
            <h4 className="text-base font-bold text-slate-200">Outbound Message volume</h4>
            <p className="text-xs text-slate-500">Comparison between SMS and WhatsApp traffic</p>
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
                  <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="SMS" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="WHATSAPP" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No volume data available.</div>
            )}
          </div>
        </Card>

        {/* Campaigns Comparison */}
        <Card>
          <div className="mb-4">
            <h4 className="text-base font-bold text-slate-200">Campaign Performance comparison</h4>
            <p className="text-xs text-slate-500">Delivery rates for the last 8 campaigns</p>
          </div>
          <div className="h-72">
            {campaignData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickFormatter={(str) => str.substring(0, 10) + '...'} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="rate" name="Delivery Success Rate (%)" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                    {campaignData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No campaign metrics logged.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Templates and Opt-Out Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates rankings */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Award className="h-5 w-5 text-primary-500" />
            <div>
              <h4 className="text-base font-bold text-slate-200 font-sans">Top Performing Templates</h4>
              <p className="text-xs text-slate-500 font-sans">Templates ranked by delivery success rate</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                  <th className="py-2.5">Template Name</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Sent</th>
                  <th className="py-2.5 text-right">Delivery Success</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {topTemplates.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-900/10">
                    <td className="py-3 font-semibold text-slate-300">{item.name}</td>
                    <td className="py-3 text-slate-400 capitalize">{item.category}</td>
                    <td className="py-3 text-slate-400">{item.totalSent} messages</td>
                    <td className="py-3 text-right font-bold text-primary-400">{item.deliveryRate}%</td>
                  </tr>
                ))}
                {topTemplates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No message template statistics found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Opt-out breakdown donut */}
        <Card>
          <div className="mb-4">
            <h4 className="text-base font-bold text-slate-200">Patient Status preferences</h4>
            <p className="text-xs text-slate-500">Comparison of opted-in vs opted-out patients</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {perfData?.optOutTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active Subscribed', value: perfData.optOutTrend.active },
                      { name: 'Opted Out', value: perfData.optOutTrend.optedOut },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">No preference metrics.</div>
            )}
            {perfData?.optOutTrend && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-100">
                  {perfData.optOutTrend.active + perfData.optOutTrend.optedOut}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Patients</span>
              </div>
            )}
          </div>
          <div className="flex justify-around mt-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-success-500">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              <span>Active: {perfData?.optOutTrend?.active ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-danger-500">
              <span className="h-2 w-2 rounded-full bg-danger-500" />
              <span>Opt-Out: {perfData?.optOutTrend?.optedOut ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

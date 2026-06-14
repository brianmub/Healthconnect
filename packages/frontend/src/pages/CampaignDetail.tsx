import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Select, Spinner } from '../components/ui';
import {
  ArrowLeft,
  Calendar,
  Send,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 10;

  // 1. Fetch Campaign Details
  const { data: campaign, isLoading: campaignLoading, error } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/campaigns/${id}`);
      return data;
    },
    enabled: !!id,
  });

  // 2. Fetch Campaign Recipients
  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['campaign-recipients', id, search, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/campaigns/${id}/recipients?page=${page}&limit=${limit}&search=${search}&status=${statusFilter}`
      );
      return data;
    },
    enabled: !!id,
  });

  // Resend failed messages mutation
  const resendFailedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/campaigns/${id}/resend-failed`);
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to trigger resend.');
    },
  });

  if (campaignLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8" />
        <span className="text-xs text-slate-500">Retrieving campaign stats...</span>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-danger-500" />
        <div>
          <h3 className="text-lg font-bold text-slate-200">Campaign Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">The requested campaign record could not be loaded.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Campaigns
        </Button>
      </div>
    );
  }

  const stats = campaign.stats || {
    pending: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    undelivered: 0,
    optOut: 0,
    total: 0,
  };

  const deliveryRate = stats.total > 0 
    ? Math.round(((stats.delivered + stats.sent) / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <div>
        <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </Link>
      </div>

      {/* Campaign Info Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              {campaign.name}
            </h1>
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
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Template: <strong>{campaign.template?.name}</strong></span>
            <span>•</span>
            <span>Channel: <strong>{campaign.channel}</strong></span>
          </p>
        </div>

        {/* Resend failed action button */}
        {(stats.failed > 0 || stats.undelivered > 0) && (
          <Button variant="primary" size="sm" onClick={() => resendFailedMutation.mutate()} isLoading={resendFailedMutation.isPending}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resend Failed ({stats.failed + stats.undelivered})
          </Button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Scheduled</span>
          <span className="text-2xl font-bold text-slate-200 mt-1">{stats.total}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Delivered/Sent</span>
          <span className="text-2xl font-bold text-success-500 mt-1">{stats.delivered + stats.sent}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Failed</span>
          <span className="text-2xl font-bold text-danger-500 mt-1">{stats.failed}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Opted Out</span>
          <span className="text-2xl font-bold text-slate-500 mt-1">{stats.optOut}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center col-span-2 md:col-span-1 border-primary-500/20 bg-primary-950/5">
          <span className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold">Success Rate</span>
          <span className="text-2xl font-bold text-primary-400 mt-1">{deliveryRate}%</span>
        </Card>
      </div>

      {/* Template content preview */}
      <Card className="bg-slate-900/10 border-slate-900">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Template Content</h3>
        <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-900">
          {campaign.template?.body}
        </p>
      </Card>

      {/* Filter recipients */}
      <Card className="py-3 px-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search recipient..."
              className="pl-8 h-8 text-xs py-1"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-36">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'QUEUED', label: 'Queued' },
                { value: 'SENT', label: 'Sent' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'OPT_OUT', label: 'Opted Out' },
              ]}
              className="h-8 py-0.5 text-xs"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing {recipientsData?.recipients?.length || 0} of {recipientsData?.pagination?.total || 0} Recipients
        </div>
      </Card>

      {/* Recipients Table */}
      <Card className="p-0 overflow-hidden">
        {recipientsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Spinner className="w-6 h-6" />
            <span className="text-xs text-slate-500">Retrieving campaign logs...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5 px-6">Recipient</th>
                  <th className="py-2.5 px-4">Phone Number</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Delivery Timestamp</th>
                  <th className="py-2.5 px-6">Fail Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(recipientsData?.recipients || []).map((recipient: any) => (
                  <tr key={recipient.id} className="hover:bg-slate-900/15">
                    <td className="py-3 px-6 font-semibold text-slate-200">
                      <Link to={`/patients/${recipient.patient?.id}`} className="hover:text-primary-400 transition-colors">
                        {recipient.patient?.firstName} {recipient.patient?.lastName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{recipient.phone}</td>
                    <td className="py-3 px-4">
                      <Badge
                        color={
                          recipient.status === 'DELIVERED' || recipient.status === 'SENT'
                            ? 'success'
                            : recipient.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {recipient.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {recipient.sentAt ? format(new Date(recipient.sentAt), 'MMM d, yyyy h:mm a') : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-6 text-danger-400 max-w-[150px] truncate" title={recipient.failReason}>
                      {recipient.failReason || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
                {(recipientsData?.recipients || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No campaign logs match selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {recipientsData?.pagination && recipientsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-850 px-6 py-3 bg-slate-900/5 text-xs text-slate-400">
            <div>
              Page {recipientsData.pagination.page} of {recipientsData.pagination.totalPages}
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="py-1 px-2"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="py-1 px-2"
                disabled={page === recipientsData.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

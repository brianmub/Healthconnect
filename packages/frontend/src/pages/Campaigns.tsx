import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Send,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

// Campaign wizard validation schema
const campaignSchema = zod.object({
  name: zod.string().min(3, 'Campaign name is required'),
  channel: zod.string(),
  templateId: zod.string().min(1, 'Template selection is required'),
  recipientType: zod.string(),
  tagFilter: zod.string().optional(),
  scheduledAt: zod.string().optional(),
});

type CampaignFormInputs = zod.infer<typeof campaignSchema>;

export default function Campaigns() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Selected patient IDs for campaign recipients
  const [manualPatientIds, setManualPatientIds] = useState<string[]>([]);

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/api/campaigns');
      return data;
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get('/api/templates');
      return data;
    },
  });

  // Fetch patients (for manual selecting)
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const { data } = await api.get('/api/patients?limit=100');
      return data.patients;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CampaignFormInputs>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      channel: 'SMS',
      templateId: '',
      recipientType: 'ALL',
      tagFilter: '',
      scheduledAt: '',
    },
  });

  // Watch variables for preview
  const watchTemplateId = watch('templateId');
  const watchRecipientType = watch('recipientType');
  const watchTagFilter = watch('tagFilter');
  const watchScheduledAt = watch('scheduledAt');

  const selectedTemplate = (templates || []).find((t: any) => t.id === watchTemplateId);

  // Interpolation preview helper
  const getPreviewBody = () => {
    if (!selectedTemplate) return '';
    return selectedTemplate.body
      .replace(/\{\{firstName\}\}/g, 'Tinashe')
      .replace(/\{\{lastName\}\}/g, 'Moyo')
      .replace(/\{\{appointmentDate\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{appointmentTime\}\}/g, '09:30 AM')
      .replace(/\{\{clinicName\}\}/g, 'Macdent Dental Surgery')
      .replace(/\{\{clinicPhone\}\}/g, '+263771234567');
  };

  // Campaign create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/campaigns', payload);
      return data;
    },
    onSuccess: (res) => {
      toast.success('Campaign created successfully.');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setWizardOpen(false);
      reset();
      setStep(1);
      setManualPatientIds([]);
      
      // Auto trigger immediate send if not scheduled
      if (!res.scheduledAt) {
        api.post(`/api/campaigns/${res.id}/send`).then(() => {
          toast.success('Campaign delivery triggered.');
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to initialize campaign.');
    },
  });

  const onSubmit = (data: CampaignFormInputs) => {
    const payload = {
      ...data,
      recipientIds: watchRecipientType === 'MANUAL' ? manualPatientIds : [],
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    };
    createMutation.mutate(payload);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!watch('name') || !watch('templateId')) {
        toast.error('Please enter campaign name and select a template.');
        return;
      }
    }
    if (step === 2) {
      if (watchRecipientType === 'MANUAL' && manualPatientIds.length === 0) {
        toast.error('Please select at least one recipient.');
        return;
      }
      if (watchRecipientType === 'TAG' && !watchTagFilter) {
        toast.error('Please enter a filter tag.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const toggleSelectPatient = (id: string) => {
    setManualPatientIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Outbound Campaigns
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build target lists, select reminder templates, and schedule notifications.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Campaign
        </Button>
      </div>

      {/* Grid List */}
      {campaignsLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8" />
          <span className="text-xs text-slate-500">Retrieving campaigns history...</span>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-6">Campaign Info</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(campaigns || []).map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-slate-900/15">
                    <td className="py-3 px-6">
                      <Link to={`/campaigns/${camp.id}`} className="font-semibold text-slate-200 hover:text-primary-400 transition-colors">
                        {camp.name}
                      </Link>
                      <p className="text-[10px] text-slate-500 mt-0.5">Created by {camp.createdBy?.name || 'Admin'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300 truncate max-w-[150px]">{camp.template?.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-400">{camp.channel}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {camp._count?.recipients ?? camp.recipients?.length ?? 0}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {camp.scheduledAt ? format(new Date(camp.scheduledAt), 'MMM d, yyyy h:mm a') : <span className="text-slate-600">Immediate</span>}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        color={
                          camp.status === 'SENT'
                            ? 'success'
                            : camp.status === 'SCHEDULED'
                            ? 'primary'
                            : camp.status === 'DRAFT'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {camp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Link to={`/campaigns/${camp.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-400 hover:text-primary-300">
                        View Details <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(campaigns || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No campaigns created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==========================================
          Campaign Create Wizard Modal (3 Steps)
          ========================================== */}
      <Modal isOpen={wizardOpen} onClose={() => { setWizardOpen(false); setStep(1); }} title="Create Outbound Campaign" className="max-w-2xl">
        <div className="mb-6 flex justify-between items-center text-xs font-semibold text-slate-500 border-b border-slate-850 pb-3">
          <span className={step >= 1 ? 'text-primary-400 font-bold' : ''}>1. Campaign Settings</span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className={step >= 2 ? 'text-primary-400 font-bold' : ''}>2. Target Recipients</span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className={step >= 3 ? 'text-primary-400 font-bold' : ''}>3. Review & Schedule</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Base settings */}
          {step === 1 && (
            <div className="space-y-4">
              <Input label="Campaign Name" placeholder="e.g. October Recall Promo" error={errors.name?.message} {...register('name')} />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Channel"
                  options={[
                    { value: 'SMS', label: 'SMS Only' },
                    { value: 'WHATSAPP', label: 'WhatsApp Only' },
                    { value: 'BOTH', label: 'Both Channels' },
                  ]}
                  {...register('channel')}
                />
                <Select
                  label="Select Template"
                  options={[
                    { value: '', label: 'Select a template...' },
                    ...(templates || []).map((t: any) => ({ value: t.id, label: `${t.name} (${t.category})` })),
                  ]}
                  error={errors.templateId?.message}
                  {...register('templateId')}
                />
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="space-y-4">
              <Select
                label="Target Group"
                options={[
                  { value: 'ALL', label: 'All Patients' },
                  { value: 'TAG', label: 'Filter by Tag' },
                  { value: 'MANUAL', label: 'Manual Selection' },
                ]}
                {...register('recipientType')}
              />

              {watchRecipientType === 'TAG' && (
                <Input
                  label="Enter Tag"
                  placeholder="e.g. vip, recall"
                  error={errors.tagFilter?.message}
                  {...register('tagFilter')}
                />
              )}

              {watchRecipientType === 'MANUAL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Select Recipients ({manualPatientIds.length} chosen)</label>
                  <div className="border border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-800/40 p-2 bg-slate-950/20">
                    {(patients || []).map((p: any) => {
                      const selected = manualPatientIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleSelectPatient(p.id)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                            selected ? 'bg-primary-500/10 border-primary-500/20 text-slate-200' : 'text-slate-400 hover:bg-slate-900/50'
                          }`}
                        >
                          <span className="text-xs font-semibold">{p.firstName} {p.lastName}</span>
                          <span className="font-mono text-[10px]">{p.phone}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review and Schedule */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Schedule Time (Leave empty to send immediately)"
                  type="datetime-local"
                  error={errors.scheduledAt?.message}
                  {...register('scheduledAt')}
                />
                <div className="text-xs text-slate-400 space-y-1 bg-slate-900/20 p-3 rounded-lg border border-slate-850">
                  <p className="font-semibold text-slate-300">Campaign details</p>
                  <p>Target group: {watchRecipientType}</p>
                  {watchRecipientType === 'TAG' && <p>Filter Tag: {watchTagFilter}</p>}
                  {watchRecipientType === 'MANUAL' && <p>Chosen count: {manualPatientIds.length}</p>}
                  <p>Send Action: {watchScheduledAt ? `Scheduled for ${watchScheduledAt}` : 'Dispatched immediately'}</p>
                </div>
              </div>

              {/* Character preview box */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-400 mb-2">Message Preview</label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[11px] text-slate-300 min-h-[120px] leading-relaxed shadow-inner">
                  {selectedTemplate ? getPreviewBody() : <span className="text-slate-600 italic">No template selected.</span>}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 mt-6">
            {step > 1 && (
              <Button variant="secondary" type="button" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button variant="primary" type="button" onClick={handleNextStep}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
                Create & Launch <Send className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

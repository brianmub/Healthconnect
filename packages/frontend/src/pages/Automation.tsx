import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Zap,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// Schema
const ruleSchema = zod.object({
  name: zod.string().min(3, 'Rule name is required'),
  trigger: zod.string(),
  offsetHours: zod.string().or(zod.number()),
  channel: zod.string(),
  templateId: zod.string().min(1, 'Template selection is required'),
  isActive: zod.boolean().optional(),
});

type RuleFormInputs = zod.infer<typeof ruleSchema>;

const TRIGGERS = [
  { value: 'APPOINTMENT_REMINDER', label: 'Appointment Reminder' },
  { value: 'APPOINTMENT_CONFIRMATION', label: 'Appointment Booking Confirmation' },
  { value: 'POST_APPOINTMENT_FOLLOWUP', label: 'Post Appointment Care Follow-up' },
  { value: 'MISSED_APPOINTMENT', label: 'Missed Appointment alert' },
  { value: 'RECALL_REMINDER', label: '6-Month Recall Reminder' },
];

const CHANNELS = [
  { value: 'SMS', label: 'SMS Only' },
  { value: 'WHATSAPP', label: 'WhatsApp Only' },
  { value: 'BOTH', label: 'Both channels' },
];

export default function Automation() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  // Queries
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data } = await api.get('/api/automation/rules');
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['templates-simple'],
    queryFn: async () => {
      const { data } = await api.get('/api/templates');
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RuleFormInputs>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: '',
      trigger: 'APPOINTMENT_REMINDER',
      offsetHours: '-24',
      channel: 'SMS',
      templateId: '',
      isActive: true,
    },
  });

  const watchTrigger = watch('trigger');
  const watchOffset = watch('offsetHours') ?? '';
  const watchChannel = watch('channel');
  const watchTemplateId = watch('templateId');

  const selectedTemplate = (templates || []).find((t: any) => t.id === watchTemplateId);

  // Preview Sentence Helper
  const getPreviewSentence = () => {
    const offsetNum = parseInt(watchOffset.toString(), 10) || 0;
    const absOffset = Math.abs(offsetNum);
    const timing = offsetNum === 0 
      ? 'immediately upon'
      : offsetNum < 0
      ? `${absOffset} hours before`
      : `${absOffset} hours after`;

    let triggerName = 'the appointment';
    if (watchTrigger === 'RECALL_REMINDER') triggerName = '6 months without visits';
    if (watchTrigger === 'MISSED_APPOINTMENT') triggerName = 'appointment missed';

    const templateName = selectedTemplate ? `"${selectedTemplate.name}"` : '[select template]';

    return `This rule will send: ${templateName} via ${watchChannel} ${timing} ${triggerName}.`;
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/automation/rules', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Automation rule created.');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create rule.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/api/automation/rules/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Automation rule updated.');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setModalOpen(false);
      setEditingRule(null);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update rule.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/automation/rules/${id}/toggle`);
      return data;
    },
    onSuccess: () => {
      toast.success('Rule state updated.');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle rule.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/automation/rules/${id}`);
    },
    onSuccess: () => {
      toast.success('Automation rule deleted.');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete rule.');
    },
  });

  const handleEditClick = (rule: any) => {
    setEditingRule(rule);
    setValue('name', rule.name);
    setValue('trigger', rule.trigger);
    setValue('offsetHours', rule.offsetHours.toString());
    setValue('channel', rule.channel);
    setValue('templateId', rule.templateId);
    setValue('isActive', rule.isActive);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingRule(null);
    reset({
      name: '',
      trigger: 'APPOINTMENT_REMINDER',
      offsetHours: '-24',
      channel: 'SMS',
      templateId: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const onSubmit = (data: RuleFormInputs) => {
    const payload = {
      ...data,
      offsetHours: parseInt(data.offsetHours.toString(), 10) || 0,
    };
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Automation Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure background triggers to dispatch appointment confirmations and recall followups automatically.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Rule
        </Button>
      </div>

      {/* Rules list */}
      {rulesLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8" />
          <span className="text-xs text-slate-500">Retrieving automation rules...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(rules || []).map((rule: any) => (
            <Card key={rule.id} className="flex flex-col justify-between hover:border-slate-800 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge color={rule.isActive ? 'primary' : 'neutral'}>
                    {rule.trigger.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{rule.channel}</span>
                    <button
                      onClick={() => toggleMutation.mutate(rule.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.isActive ? 'bg-primary-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rule.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-200">{rule.name}</h3>
                
                <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-900 flex items-start gap-2.5 text-xs text-slate-400">
                  <Clock className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">Timing offset: </span>
                    {rule.offsetHours === 0 
                      ? 'Instant upon event booking' 
                      : rule.offsetHours < 0 
                      ? `${Math.abs(rule.offsetHours)} hours before event` 
                      : `${rule.offsetHours} hours after event`}
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-semibold">
                  Template: <span className="text-primary-400">{rule.template?.name}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-900/60 mt-4">
                <Button variant="secondary" size="sm" className="py-1 px-2.5 text-xs h-8" onClick={() => handleEditClick(rule)}>
                  Configure
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="py-1 px-2.5 text-xs h-8 text-danger-500 hover:text-danger-400"
                  onClick={() => {
                    if (confirm('Delete automation rule?')) {
                      deleteMutation.mutate(rule.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
          {(rules || []).length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              No background automation rules set up.
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Rule Name" placeholder="e.g. 24 Hour Appointment Reminder" error={errors.name?.message} {...register('name')} />
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Trigger Event" options={TRIGGERS} error={errors.trigger?.message} {...register('trigger')} />
            <Select label="Channel" options={CHANNELS} error={errors.channel?.message} {...register('channel')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Offset Hours (e.g. -24 for 24h before, 2 for 2h after)"
              placeholder="-24"
              error={errors.offsetHours?.message}
              {...register('offsetHours')}
            />
            <Select
              label="Assign Template"
              options={[
                { value: '', label: 'Select template...' },
                ...(templates || []).map((t: any) => ({ value: t.id, label: t.name })),
              ]}
              error={errors.templateId?.message}
              {...register('templateId')}
            />
          </div>

          {/* Dynamic Preview */}
          <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl flex items-start gap-2.5 mt-2">
            <HelpCircle className="h-5 w-5 text-primary-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-400 block mb-1">Rule Preview Behavior</span>
              <p className="text-slate-300 italic leading-relaxed">{getPreviewSentence()}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

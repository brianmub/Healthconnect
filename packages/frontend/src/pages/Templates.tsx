import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Textarea, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  HelpCircle,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

// Schema
const templateSchema = zod.object({
  name: zod.string().min(3, 'Template name is required'),
  category: zod.string(),
  channel: zod.string(),
  body: zod.string().min(5, 'Template body is required'),
});

type TemplateFormInputs = zod.infer<typeof templateSchema>;

const CATEGORIES = [
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'CONFIRMATION', label: 'Confirmation' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'GENERAL', label: 'General' },
  { value: 'MISSED_APPOINTMENT', label: 'Missed Appointment' },
];

const CHANNELS = [
  { value: 'SMS', label: 'SMS Only' },
  { value: 'WHATSAPP', label: 'WhatsApp Only' },
  { value: 'BOTH', label: 'Both channels' },
];

export default function Templates() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Queries
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
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
  } = useForm<TemplateFormInputs>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      category: 'REMINDER',
      channel: 'SMS',
      body: '',
    },
  });

  // Watch body for counts and previews
  const bodyValue = watch('body') || '';

  // Calculate segments (SMS: 160 characters per segment)
  const charCount = bodyValue.length;
  const smsSegments = charCount > 0 ? Math.ceil(charCount / 160) : 0;

  // Live Interpolation Preview helper
  const getPreviewText = (templateText: string) => {
    return templateText
      .replace(/\{\{firstName\}\}/g, 'Tinashe')
      .replace(/\{\{lastName\}\}/g, 'Moyo')
      .replace(/\{\{appointmentDate\}\}/g, formatSampleDate())
      .replace(/\{\{appointmentTime\}\}/g, '09:30 AM')
      .replace(/\{\{clinicName\}\}/g, 'Macdent Dental Surgery')
      .replace(/\{\{clinicPhone\}\}/g, '+263771234567')
      .replace(/\{\{title\}\}/g, 'Dr.')
      .replace(/\{\{gender\}\}/g, 'Male')
      .replace(/\{\{patientCategory\}\}/g, 'Medical Aid')
      .replace(/\{\{paymentMethod\}\}/g, 'Swipe')
      .replace(/\{\{phone\}\}/g, '+263771234567')
      .replace(/\{\{email\}\}/g, 'tinashe@example.com')
      .replace(/\{\{whatsapp\}\}/g, '+263771234567')
      .replace(/\{\{dateOfBirth\}\}/g, '1990-05-15');
  };

  const formatSampleDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Tomorrow
    return d.toLocaleDateString();
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/templates', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Message template created.');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create template.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/api/templates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Message template updated.');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setModalOpen(false);
      setEditingTemplate(null);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update template.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/templates/${id}`);
    },
    onSuccess: () => {
      toast.success('Template deleted.');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete template.');
    },
  });

  const handleEditClick = (template: any) => {
    setEditingTemplate(template);
    setValue('name', template.name);
    setValue('category', template.category);
    setValue('channel', template.channel);
    setValue('body', template.body);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingTemplate(null);
    reset({
      name: '',
      category: 'REMINDER',
      channel: 'SMS',
      body: '',
    });
    setModalOpen(true);
  };

  const onSubmit = (data: TemplateFormInputs) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const insertVariable = (variable: string) => {
    setValue('body', bodyValue + ` {{${variable}}}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Message Templates
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create reusable templates for reminders, confirmations, and announcements.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Template
        </Button>
      </div>

      {/* Grid of cards */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8" />
          <span className="text-xs text-slate-500">Retrieving templates grid...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(templates || []).map((template: any) => (
            <Card key={template.id} className="flex flex-col justify-between space-y-4 hover:border-slate-800 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge color="info">{template.category}</Badge>
                  <span className="text-slate-500 flex items-center gap-1 text-[11px] font-semibold">
                    {template.channel === 'WHATSAPP' ? (
                      <MessageSquare className="h-3.5 w-3.5 text-success-500" />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5 text-primary-500" />
                    )}
                    {template.channel}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-200 truncate">{template.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed bg-slate-950/20 p-2.5 rounded border border-slate-900 font-mono">
                  {template.body}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-900/60">
                <Button variant="secondary" size="sm" className="py-1 px-2.5 text-xs h-8" onClick={() => handleEditClick(template)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="py-1 px-2.5 text-xs h-8 text-danger-500 hover:text-danger-400 hover:bg-danger-500/5"
                  onClick={() => {
                    if (confirm('Delete message template?')) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))}
          {(templates || []).length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              No message templates designed yet.
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form details */}
          <div className="space-y-4">
            <Input label="Template Name" error={errors.name?.message} {...register('name')} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" options={CATEGORIES} error={errors.category?.message} {...register('category')} />
              <Select label="Channel" options={CHANNELS} error={errors.channel?.message} {...register('channel')} />
            </div>

            {/* Insertion Helper Tags */}
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-1">Insert Variable</span>
              <div className="flex flex-wrap gap-1">
                {['firstName', 'lastName', 'title', 'gender', 'patientCategory', 'paymentMethod', 'phone', 'email', 'whatsapp', 'dateOfBirth', 'appointmentDate', 'appointmentTime', 'clinicName', 'clinicPhone'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700/60 font-semibold"
                    onClick={() => insertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Textarea label="Message Body" placeholder="Dear {{firstName}}..." error={errors.body?.message} {...register('body')} />
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mt-1">
                <span>{charCount} Characters</span>
                <span>{smsSegments} SMS Segments</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="flex flex-col justify-between bg-slate-900/30 border border-slate-850 rounded-xl p-5">
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary-500" /> Interactive Sample Preview
              </h4>
              <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[11px] leading-relaxed text-slate-300 min-h-[120px] shadow-inner">
                {bodyValue ? getPreviewText(bodyValue) : <span className="text-slate-600 italic">Enter message body...</span>}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-6 border-t border-slate-800/40 mt-6 lg:mt-0">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

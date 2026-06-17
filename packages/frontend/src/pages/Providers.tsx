import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Button, Input, Modal, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import { toast } from 'sonner';

const providerSchema = zod.object({
  firstName: zod.string().min(1, 'First name is required'),
  lastName: zod.string().min(1, 'Last name is required'),
  specialization: zod.string().optional(),
  email: zod.string().email('Invalid email').optional().or(zod.literal('')),
  phone: zod.string().optional(),
  color: zod.string().min(1, 'Color is required'),
});

type ProviderFormInputs = zod.infer<typeof providerSchema>;

export default function Providers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<any | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data } = await api.get('/api/providers');
      return data;
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProviderFormInputs>({
    resolver: zodResolver(providerSchema),
    defaultValues: { color: '#3b82f6' }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: ProviderFormInputs) => {
      const { data } = await api.post('/api/providers', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Provider added');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setModalOpen(false);
      reset();
    },
    onError: () => toast.error('Failed to add provider')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: ProviderFormInputs }) => {
      const { data } = await api.put(`/api/providers/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Provider updated');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setModalOpen(false);
      setEditProvider(null);
      reset();
    },
    onError: () => toast.error('Failed to update provider')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/providers/${id}`);
    },
    onSuccess: () => {
      toast.success('Provider removed');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
    onError: () => toast.error('Failed to remove provider')
  });

  const openEdit = (p: any) => {
    setEditProvider(p);
    setValue('firstName', p.firstName);
    setValue('lastName', p.lastName);
    setValue('specialization', p.specialization || '');
    setValue('email', p.email || '');
    setValue('phone', p.phone || '');
    setValue('color', p.color || '#3b82f6');
    setModalOpen(true);
  };

  const onSubmit = (data: ProviderFormInputs) => {
    if (editProvider) {
      updateMutation.mutate({ id: editProvider.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-500" />
            Providers Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage doctors and medical staff.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditProvider(null); reset(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Provider
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(providers || []).map((provider: any) => (
            <Card key={provider.id} className="relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: provider.color }} />
              <div className="pl-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">Dr. {provider.firstName} {provider.lastName}</h3>
                    <p className="text-xs text-slate-400 font-medium">{provider.specialization || 'General Practitioner'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(provider)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if(confirm('Remove this provider?')) deleteMutation.mutate(provider.id); }} className="p-1.5 text-danger-400 hover:text-white bg-danger-500/10 rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-300">
                  {provider.email && <p>{provider.email}</p>}
                  {provider.phone && <p>{provider.phone}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditProvider(null); }} title={editProvider ? "Edit Provider" : "Add Provider"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Specialization" placeholder="e.g. Orthodontist" error={errors.specialization?.message} {...register('specialization')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Calendar Color</label>
            <input type="color" className="h-9 w-full rounded border border-slate-700 bg-slate-900 cursor-pointer" {...register('color')} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending || updateMutation.isPending}>
              Save Provider
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

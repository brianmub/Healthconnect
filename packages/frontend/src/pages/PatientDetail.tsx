import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Spinner, Input, Textarea, Select } from '../components/ui';
import { ArrowLeft, Calendar, Mail, Phone, AlertCircle, Clock, Tag, Cake, FileText, Activity, CreditCard, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InvoiceGenerator from '../components/billing/InvoiceGenerator';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notes' | 'billing'>('overview');
  
  // State for forms
  const [newCondition, setNewCondition] = useState({ condition: '', notes: '' });
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'MODERATE' });
  const [newNote, setNewNote] = useState({ content: '', providerId: '', appointmentId: '' });
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data } = await api.get('/api/providers');
      return data;
    }
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
  });

  // Clinical Actions
  const addConditionMutation = useMutation({
    mutationFn: async (payload: any) => await api.post('/api/clinical/conditions', { patientId: id, ...payload }),
    onSuccess: () => { toast.success('Condition added'); setNewCondition({ condition: '', notes: '' }); queryClient.invalidateQueries({ queryKey: ['patient', id] }); }
  });
  const deleteConditionMutation = useMutation({
    mutationFn: async (condId: string) => await api.delete(`/api/clinical/conditions/${condId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient', id] })
  });

  const addAllergyMutation = useMutation({
    mutationFn: async (payload: any) => await api.post('/api/clinical/allergies', { patientId: id, ...payload }),
    onSuccess: () => { toast.success('Allergy added'); setNewAllergy({ allergen: '', severity: 'MODERATE' }); queryClient.invalidateQueries({ queryKey: ['patient', id] }); }
  });
  const deleteAllergyMutation = useMutation({
    mutationFn: async (allId: string) => await api.delete(`/api/clinical/allergies/${allId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient', id] })
  });

  const addNoteMutation = useMutation({
    mutationFn: async (payload: any) => await api.post('/api/clinical/notes', { patientId: id, ...payload }),
    onSuccess: () => { toast.success('Note added'); setNewNote({ content: '', providerId: '', appointmentId: '' }); queryClient.invalidateQueries({ queryKey: ['patient', id] }); }
  });

  if (isLoading) return <div className="h-[60vh] flex justify-center"><Spinner /></div>;
  if (error || !patient) return <div className="text-center text-danger-500 py-10">Patient Not Found</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <Link to="/patients" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Database
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card className="flex flex-col md:flex-row items-center gap-6">
        <div className="h-20 w-20 shrink-0 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/20 text-3xl font-bold text-primary-400 uppercase">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-2xl font-bold text-slate-200">
            {patient.title ? `${patient.title} ` : ''}{patient.firstName} {patient.lastName}
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {patient.phone}</span>
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {patient.email || 'No email'}</span>
            <span className="flex items-center gap-1"><Cake className="h-4 w-4" /> {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'MMM d, yyyy') : 'No DOB'}</span>
            {patient.gender && <span className="flex items-center gap-1"><User className="h-4 w-4" /> {patient.gender}</span>}
            {patient.patientCategory && <span className="flex items-center gap-1"><Tag className="h-4 w-4" /> Category: {patient.patientCategory}</span>}
            {patient.paymentMethod && <span className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Payment: {patient.paymentMethod}</span>}
          </div>
          <div className="flex flex-wrap gap-1 justify-center md:justify-start mt-2">
            {patient.tags?.map((t: any) => (
              <span key={t.id} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                <Tag className="h-2.5 w-2.5" /> {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <Button variant={patient.optedOut ? 'danger' : 'success'} size="sm" onClick={() => toggleOptOutMutation.mutate()} isLoading={toggleOptOutMutation.isPending}>
            {patient.optedOut ? 'Messaging Opted Out' : 'Messaging Active'}
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', icon: Calendar, label: 'Overview & Appts' },
          { id: 'history', icon: Activity, label: 'Medical History' },
          { id: 'notes', icon: FileText, label: 'Clinical Notes' },
          { id: 'billing', icon: CreditCard, label: 'Billing & Invoices' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <Card>
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /> Appointments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Provider</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {patient.appointments?.map((appt: any) => (
                    <tr key={appt.id}>
                      <td className="py-3 font-semibold text-slate-300">{format(new Date(appt.dateTime), 'MMM d, yyyy h:mm a')}</td>
                      <td className="py-3 text-slate-400">{appt.provider ? `Dr. ${appt.provider.lastName}` : '-'}</td>
                      <td className="py-3 text-slate-400 capitalize">{appt.type}</td>
                      <td className="py-3"><Badge color={appt.status === 'COMPLETED' ? 'success' : appt.status === 'CONFIRMED' ? 'primary' : 'neutral'}>{appt.status}</Badge></td>
                    </tr>
                  ))}
                  {!patient.appointments?.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No appointments found.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* MEDICAL HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning-500" /> Allergies</h3>
              <div className="space-y-3 mb-6">
                {patient.allergies?.map((a: any) => (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div><p className="font-bold text-slate-200">{a.allergen}</p><p className="text-xs text-slate-500">Severity: {a.severity}</p></div>
                    <button onClick={() => deleteAllergyMutation.mutate(a.id)} className="text-danger-400 hover:text-danger-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {!patient.allergies?.length && <p className="text-xs text-slate-500">No recorded allergies.</p>}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1"><Input placeholder="New Allergen" value={newAllergy.allergen} onChange={e => setNewAllergy({...newAllergy, allergen: e.target.value})} /></div>
                <Select options={[{value:'MILD',label:'Mild'},{value:'MODERATE',label:'Moderate'},{value:'SEVERE',label:'Severe'}]} value={newAllergy.severity} onChange={(e: any) => setNewAllergy({...newAllergy, severity: e.target.value})} />
                <Button variant="primary" onClick={() => addAllergyMutation.mutate(newAllergy)} disabled={!newAllergy.allergen}><Plus className="h-4 w-4" /></Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-primary-500" /> Medical Conditions</h3>
              <div className="space-y-3 mb-6">
                {patient.medicalConditions?.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-start p-3 bg-slate-900/40 border border-slate-800 rounded">
                    <div>
                      <p className="font-bold text-slate-200">{c.condition}</p>
                      {c.notes && <p className="text-xs text-slate-400 mt-1">{c.notes}</p>}
                    </div>
                    <button onClick={() => deleteConditionMutation.mutate(c.id)} className="text-danger-400 hover:text-danger-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {!patient.medicalConditions?.length && <p className="text-xs text-slate-500">No recorded conditions.</p>}
              </div>
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <Input placeholder="Condition (e.g. Diabetes)" value={newCondition.condition} onChange={e => setNewCondition({...newCondition, condition: e.target.value})} />
                <Input placeholder="Notes..." value={newCondition.notes} onChange={e => setNewCondition({...newCondition, notes: e.target.value})} />
                <Button variant="primary" className="w-full" onClick={() => addConditionMutation.mutate(newCondition)} disabled={!newCondition.condition}>Add Condition</Button>
              </div>
            </Card>
          </div>
        )}

        {/* CLINICAL NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {patient.clinicalNotes?.map((note: any) => (
                <Card key={note.id} className="border-l-4 border-l-primary-500">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-slate-400 space-x-2">
                      <span className="font-bold text-slate-300">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span>{note.provider ? `Dr. ${note.provider.lastName}` : 'System/Staff'}</span>
                      {note.appointment && <span>• Appt: {note.appointment.type}</span>}
                    </div>
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap">{note.content}</div>
                </Card>
              ))}
              {!patient.clinicalNotes?.length && <Card><p className="text-center text-slate-500 text-sm py-8">No clinical notes recorded yet.</p></Card>}
            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <h3 className="text-base font-bold text-slate-200 mb-4">Add Clinical Note</h3>
                <div className="space-y-3">
                  <Select 
                    label="Provider" 
                    options={[{value: '', label: 'Select...'}, ...(providers || []).map((p: any) => ({value: p.id, label: `Dr. ${p.lastName}`}))]} 
                    value={newNote.providerId} onChange={(e: any) => setNewNote({...newNote, providerId: e.target.value})} 
                  />
                  <Select 
                    label="Link to Appointment" 
                    options={[{value: '', label: 'None'}, ...(patient.appointments || []).map((a: any) => ({value: a.id, label: `${format(new Date(a.dateTime), 'MMM d')} - ${a.type}`}))]} 
                    value={newNote.appointmentId} onChange={(e: any) => setNewNote({...newNote, appointmentId: e.target.value})} 
                  />
                  <Textarea label="Treatment Notes" rows={6} value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})} />
                  <Button variant="primary" className="w-full" onClick={() => addNoteMutation.mutate(newNote)} disabled={!newNote.content}>Save Note</Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200">Invoices & Payments</h3>
              <Button variant="primary" onClick={() => setInvoiceModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> Generate Invoice</Button>
            </div>
            <Card className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {patient.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-900/30">
                      <td className="py-3 px-4 font-mono text-slate-300">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-400">{format(new Date(inv.issueDate), 'MMM d, yyyy')}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">${inv.total.toFixed(2)}</td>
                      <td className="py-3 px-4"><Badge color={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => window.print()}>Print / PDF</Button>
                      </td>
                    </tr>
                  ))}
                  {!patient.invoices?.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No billing records found.</td></tr>}
                </tbody>
              </table>
            </Card>
            
            <InvoiceGenerator isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} patientId={id} appointments={patient.appointments || []} />
          </div>
        )}

      </div>
    </div>
  );
}

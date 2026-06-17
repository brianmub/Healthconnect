import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Modal, Button, Input, Select } from '../ui';
import { Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceGenerator({ isOpen, onClose, patientId, appointments }: any) {
  const queryClient = useQueryClient();
  const [appointmentId, setAppointmentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: 'Dental Consultation', quantity: 1, unitPrice: 50, total: 50 }]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/billing/invoices', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice generated');
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      onClose();
    },
    onError: () => toast.error('Failed to generate invoice')
  });

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item: any = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      item.total = Number(item.quantity) * Number(item.unitPrice);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    createMutation.mutate({
      patientId,
      appointmentId: appointmentId || undefined,
      dueDate,
      lineItems: items
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Invoice" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Link to Appointment (Optional)" 
            options={[{value: '', label: 'None'}, ...appointments.map((a: any) => ({value: a.id, label: `${a.type} - ${new Date(a.dateTime).toLocaleDateString()}`}))]}
            value={appointmentId} onChange={(e: any) => setAppointmentId(e.target.value)} 
          />
          <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-slate-300">Line Items</h4>
            <Button variant="secondary" size="sm" type="button" onClick={handleAddItem}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                <div className="flex-1"><Input placeholder="Description" value={item.description} onChange={e => handleUpdateItem(index, 'description', e.target.value)} required /></div>
                <div className="w-20"><Input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleUpdateItem(index, 'quantity', e.target.value)} required /></div>
                <div className="w-24"><Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => handleUpdateItem(index, 'unitPrice', e.target.value)} required /></div>
                <div className="w-24 px-2 text-right font-bold text-slate-300">${item.total.toFixed(2)}</div>
                <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-danger-400 hover:text-danger-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end text-lg font-bold text-slate-200">
            Total: ${subtotal.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Save & Issue Invoice</Button>
        </div>
      </form>
    </Modal>
  );
}

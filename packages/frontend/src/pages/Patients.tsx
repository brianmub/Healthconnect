import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Modal, Select, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Search,
  Plus,
  Download,
  Upload,
  UserCheck,
  Tag,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

// Validation schemas
const patientSchema = zod.object({
  firstName: zod.string().min(2, 'First name is required'),
  lastName: zod.string().min(2, 'Last name is required'),
  phone: zod.string().min(8, 'Valid phone number is required'),
  email: zod.string().email('Please enter a valid email address').optional().or(zod.literal('')),
  whatsapp: zod.string().optional().or(zod.literal('')),
  dateOfBirth: zod.string().optional().or(zod.literal('')),
  tags: zod.string().optional(), // Comma-separated tags
});

type PatientFormInputs = zod.infer<typeof patientSchema>;

export default function Patients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [optedOutFilter, setOptedOutFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected patient IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkTagName, setBulkTagName] = useState('');
  const [bulkActionType, setBulkActionType] = useState<'addTag' | 'removeTag'>('addTag');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Fetch Patients Query
  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, tagFilter, optedOutFilter, page],
    queryFn: async () => {
      let url = `/api/patients?page=${page}&limit=${limit}&search=${search}&tag=${tagFilter}`;
      if (optedOutFilter !== 'all') {
        url += `&optedOut=${optedOutFilter}`;
      }
      const { data } = await api.get(url);
      return data;
    },
  });

  // Create Patient Form
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<PatientFormInputs>({
    resolver: zodResolver(patientSchema),
  });

  // Edit Patient Form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    formState: { errors: errorsEdit },
  } = useForm<PatientFormInputs>({
    resolver: zodResolver(patientSchema),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/patients', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Patient created successfully.');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setAddModalOpen(false);
      resetAdd();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create patient.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/api/patients/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Patient profile updated.');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditPatient(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update patient.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/patients/${id}`);
    },
    onSuccess: () => {
      toast.success('Patient deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete patient.');
    },
  });

  const toggleOptOutMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/patients/${id}/opt-out`);
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle opt-out.');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/patients/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      setImportResult(res);
      toast.success('CSV Import complete.');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setCsvFile(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to import CSV.');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/patients/bulk', {
        patientIds: selectedIds,
        action: bulkActionType,
        data: { tag: bulkTagName }
      });
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkTagName('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Bulk action failed.');
    }
  });

  // Handle edits trigger
  const handleOpenEdit = (patient: any) => {
    setEditPatient(patient);
    setEditValue('firstName', patient.firstName);
    setEditValue('lastName', patient.lastName);
    setEditValue('phone', patient.phone);
    setEditValue('email', patient.email || '');
    setEditValue('whatsapp', patient.whatsapp || '');
    setEditValue('dateOfBirth', patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '');
    setEditValue('tags', patient.tags?.map((t: any) => t.name).join(', ') || '');
  };

  const handleCreateSubmit = (data: PatientFormInputs) => {
    const payload = {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (data: PatientFormInputs) => {
    if (!editPatient) return;
    const payload = {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    updateMutation.mutate({ id: editPatient.id, payload });
  };

  const handleExport = () => {
    window.open('/api/patients/export', '_blank');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (patientsList: any[]) => {
    const ids = patientsList.map((p) => p.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Patients Database
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage contact records, patient tags, and subscription preferences.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExport} className="h-9">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(true)} className="h-9">
            <Upload className="h-4 w-4 mr-1.5" /> Import CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)} className="h-9 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add Patient
          </Button>
        </div>
      </div>

      {/* Bulk actions drawer overlay */}
      {selectedIds.length > 0 && (
        <Card className="glass-panel border-primary-500/30 bg-primary-950/20 py-3 px-4 flex items-center justify-between gap-4">
          <span className="text-xs text-primary-400 font-bold">
            {selectedIds.length} patients selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="py-1 px-3 text-xs h-8"
              onClick={() => {
                setBulkActionType('addTag');
                setBulkActionOpen(true);
              }}
            >
              <Tag className="h-3.5 w-3.5 mr-1" /> Add Tag
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="py-1 px-3 text-xs h-8 border-danger-500/20 text-danger-400 hover:bg-danger-500/10"
              onClick={() => {
                setBulkActionType('removeTag');
                setBulkActionOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Tag
            </Button>
            <Button variant="ghost" size="sm" className="py-1 px-2 text-xs h-8" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Filters card */}
      <Card className="py-4 px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search patients name, phone..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-40">
            <Input
              placeholder="Filter by tag..."
              className="h-9"
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-36">
            <Select
              options={[
                { value: 'all', label: 'All Preferences' },
                { value: 'false', label: 'Subscribed' },
                { value: 'true', label: 'Opted Out' },
              ]}
              className="h-9 py-1"
              value={optedOutFilter}
              onChange={(e) => {
                setOptedOutFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing {data?.patients?.length || 0} of {data?.pagination?.total || 0} Patient Records
        </div>
      </Card>

      {/* Main patients table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner className="w-8 h-8" />
            <span className="text-xs text-slate-500">Retrieving patient listings...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6 w-10">
                    <button
                      onClick={() => toggleSelectAll(data?.patients || [])}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {data?.patients?.length > 0 &&
                      data.patients.every((p: any) => selectedIds.includes(p.id)) ? (
                        <CheckSquare className="h-4 w-4 text-primary-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">WhatsApp</th>
                  <th className="py-3 px-4">Patient Tags</th>
                  <th className="py-3 px-4">Opt-Out</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(data?.patients || []).map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-slate-900/15 transition-colors">
                    <td className="py-3 px-6">
                      <button
                        onClick={() => toggleSelect(patient.id)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        {selectedIds.includes(patient.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary-500" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/patients/${patient.id}`} className="font-semibold text-slate-200 hover:text-primary-400 transition-colors">
                        {patient.firstName} {patient.lastName}
                      </Link>
                      <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{patient.email || 'No email address'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{patient.phone}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {patient.whatsapp ? (
                        <span className="text-success-500">Yes</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {patient.tags?.map((t: any) => (
                          <span key={t.id} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                            {t.name}
                          </span>
                        ))}
                        {(!patient.tags || patient.tags.length === 0) && (
                          <span className="text-slate-600 text-[10px] italic">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleOptOutMutation.mutate(patient.id)}
                        className="focus:outline-none"
                      >
                        <Badge color={patient.optedOut ? 'danger' : 'success'}>
                          {patient.optedOut ? 'Opted Out' : 'Subscribed'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(patient)}>
                        <Edit2 className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          if (confirm('Delete patient record? This action is permanent.')) {
                            deleteMutation.mutate(patient.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger-500 hover:text-danger-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data?.patients || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No patient listings found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-850 px-6 py-3 bg-slate-900/5 text-xs text-slate-400">
            <div>
              Page {data.pagination.page} of {data.pagination.totalPages}
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
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* Add Patient Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Patient">
        <form onSubmit={handleSubmitAdd(handleCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errorsAdd.firstName?.message} {...registerAdd('firstName')} />
            <Input label="Last Name" error={errorsAdd.lastName?.message} {...registerAdd('lastName')} />
          </div>
          <Input label="Phone Number (e.g. +26377...)" error={errorsAdd.phone?.message} {...registerAdd('phone')} />
          <Input label="WhatsApp Number (Optional)" error={errorsAdd.whatsapp?.message} {...registerAdd('whatsapp')} />
          <Input label="Email Address (Optional)" error={errorsAdd.email?.message} {...registerAdd('email')} />
          <Input label="Date of Birth" type="date" error={errorsAdd.dateOfBirth?.message} {...registerAdd('dateOfBirth')} />
          <Input label="Patient Tags (Comma separated, e.g. VIP, recall)" error={errorsAdd.tags?.message} {...registerAdd('tags')} />
          
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={editPatient !== null} onClose={() => setEditPatient(null)} title="Edit Patient Details">
        <form onSubmit={handleSubmitEdit(handleEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" error={errorsEdit.firstName?.message} {...registerEdit('firstName')} />
            <Input label="Last Name" error={errorsEdit.lastName?.message} {...registerEdit('lastName')} />
          </div>
          <Input label="Phone Number" error={errorsEdit.phone?.message} {...registerEdit('phone')} />
          <Input label="WhatsApp Number (Optional)" error={errorsEdit.whatsapp?.message} {...registerEdit('whatsapp')} />
          <Input label="Email Address (Optional)" error={errorsEdit.email?.message} {...registerEdit('email')} />
          <Input label="Date of Birth" type="date" error={errorsEdit.dateOfBirth?.message} {...registerEdit('dateOfBirth')} />
          <Input label="Patient Tags (Comma separated)" error={errorsEdit.tags?.message} {...registerEdit('tags')} />
          
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditPatient(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setImportResult(null); }} title="Import Patients CSV">
        {importResult ? (
          <div className="space-y-4">
            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800">
              <p className="text-sm font-semibold text-slate-200">Import Summary</p>
              <p className="text-xs text-slate-400 mt-2">{importResult.summary}</p>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-success-500/5 border border-success-500/10 p-2 rounded">
                  <span className="text-slate-500">Imported</span>
                  <p className="text-lg font-bold text-success-500">{importResult.successCount}</p>
                </div>
                <div className="bg-danger-500/5 border border-danger-500/10 p-2 rounded">
                  <span className="text-slate-500">Skipped/Errors</span>
                  <p className="text-lg font-bold text-danger-500">
                    {importResult.invalidPhoneCount + importResult.duplicateCount + importResult.errorCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <Button
                variant="primary"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportResult(null);
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Upload a `.csv` file. Headers must include: `firstName`, `lastName`, `phone`, `email` and optionally `tags`.
            </p>
            <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 text-center hover:border-slate-700 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setCsvFile(e.target.files[0]);
                  }
                }}
              />
              <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">
                {csvFile ? csvFile.name : 'Click to browse or drag CSV file here'}
              </p>
              {csvFile && <p className="text-[10px] text-slate-500 mt-1">{(csvFile.size / 1024).toFixed(1)} KB</p>}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setImportModalOpen(false);
                  setCsvFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!csvFile}
                isLoading={importMutation.isPending}
                onClick={() => csvFile && importMutation.mutate(csvFile)}
              >
                Upload & Import
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Tag Action Modal */}
      <Modal isOpen={bulkActionOpen} onClose={() => setBulkActionOpen(false)} title={`${bulkActionType === 'addTag' ? 'Add Tag to' : 'Remove Tag from'} Selected Patients`}>
        <div className="space-y-4">
          <Input
            label="Tag Name"
            placeholder="e.g. vip"
            value={bulkTagName}
            onChange={(e) => setBulkTagName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setBulkActionOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!bulkTagName.trim()} isLoading={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
              Apply Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

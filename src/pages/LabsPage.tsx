import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FlaskConical, Search, Building2, Layers, Cpu } from 'lucide-react';
import { Lab } from '../types';
import { labService } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const LabsPage: React.FC = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Lab | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    labCode: '',
    labType: 'Software Systems',
    benchCapacity: 35,
    building: 'Tech Wing',
    floor: 1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await labService.getAll();
      setLabs(data);
    } catch (err) {
      console.error('Failed to load labs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: `HTML Lab ${labs.length + 1}`,
      labCode: `LAB-${100 + labs.length + 1}`,
      labType: 'Software Systems',
      benchCapacity: 35,
      building: 'Tech Wing',
      floor: 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Lab) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      labCode: item.labCode,
      labType: item.labType,
      benchCapacity: item.benchCapacity,
      building: item.building,
      floor: item.floor,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await labService.delete(deletingId);
      setDeletingId(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await labService.update(editingItem.id, formData);
      } else {
        await labService.create(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filtered = labs.filter(
    l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.labCode.toLowerCase().includes(search.toLowerCase()) ||
      l.labType.toLowerCase().includes(search.toLowerCase()) ||
      l.building.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-violet-400" />
            <span>Laboratory Management</span>
          </h1>
          <p className="text-xs text-slate-400">
            Define bench capacity, equipment types, and lab codes used for batch-based practical sessions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lab</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by lab name, code, or type..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Lab Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading laboratories...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <FlaskConical className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No laboratories found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Lab Name & Code</th>
                  <th className="p-4">Bench Capacity</th>
                  <th className="p-4">Specialization / Type</th>
                  <th className="p-4">Building & Floor</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          <FlaskConical className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Code: {item.labCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-950/50 text-violet-300 border border-violet-800/50">
                        <Cpu className="w-3 h-3 text-violet-400" />
                        {item.benchCapacity} Benches
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{item.labType}</td>
                    <td className="p-4">
                      <div className="text-slate-300 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {item.building} (Floor {item.floor})
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white">
              {editingItem ? 'Edit Laboratory' : 'Add New Laboratory'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Lab Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. HTML Lab"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Lab Code</label>
                  <input
                    type="text"
                    required
                    value={formData.labCode}
                    onChange={e => setFormData({ ...formData, labCode: e.target.value })}
                    placeholder="LAB-HTML"
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Bench Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.benchCapacity}
                    onChange={e => setFormData({ ...formData, benchCapacity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Specialization / Type</label>
                <input
                  type="text"
                  required
                  value={formData.labType}
                  onChange={e => setFormData({ ...formData, labType: e.target.value })}
                  placeholder="Web Tech, Software, AI"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Building</label>
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={e => setFormData({ ...formData, building: e.target.value })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Floor</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/20"
                >
                  Save Lab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Laboratory"
        message="Are you sure you want to delete this laboratory? Any lab practical sessions scheduled here will be affected."
        confirmText="Delete Lab"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

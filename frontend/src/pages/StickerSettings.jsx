import { useState, useEffect, useRef } from 'react';
import { Ticket, Plus, Search, Edit, Trash2, X, Filter, ChevronDown, Square, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast'; 
import { apiFetch } from '../api';

const StickerSettings = () => {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTerritories, setSelectedTerritories] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', vehicle_category: 'D1', duration: 'Napi', territory: 'Országos', price: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const fetchStickers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/sticker-types');
      const data = await res.json();
      setStickers(data);
    } catch (err) { 
      toast.error('Hiba a matricák betöltésekor.'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchStickers(); 
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategories, selectedTerritories, selectedDurations]);

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = formData.id !== null;
    const endpoint = isEdit ? `/sticker-types/${formData.id}` : '/sticker-types';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      await apiFetch(endpoint, { method, body: JSON.stringify(formData) });
      toast.success(`Matrica típus ${isEdit ? 'módosítva' : 'létrehozva'}!`);
      setIsModalOpen(false);
      fetchStickers();
    } catch (err) { 
      toast.error('Hiba mentéskor!'); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Biztosan törlöd ezt a matrica típust a katalógusból?')) {
      try {
        await apiFetch(`/sticker-types/${id}`, { method: 'DELETE' });
        toast.success('Matrica típus törölve!');
        fetchStickers();
      } catch (err) {
        toast.error('Nem sikerült törölni a típust.');
      }
    }
  };

  const openAdd = () => { setFormData({ id: null, name: '', vehicle_category: 'D1', duration: 'Napi', territory: 'Országos', price: '' }); setIsModalOpen(true); };
  const openEdit = (st) => { setFormData({ ...st }); setIsModalOpen(true); };

  const toggleSelection = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const clearFilters = () => {
    setSearchTerm(''); setSelectedCategories([]); setSelectedTerritories([]); setSelectedDurations([]); setOpenDropdown(null);
  };

  const filteredStickers = stickers.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(st.vehicle_category);
    const matchesTerr = selectedTerritories.length === 0 || selectedTerritories.includes(st.territory);
    const matchesDur = selectedDurations.length === 0 || selectedDurations.includes(st.duration);
    return matchesSearch && matchesCat && matchesTerr && matchesDur;
  });

  const sortedStickers = [...filteredStickers].sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = sortedStickers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentStickers = sortedStickers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Matricák</h2>
        <button onClick={openAdd} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-[#13395C] text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-[#0B2C4B] transition-all shadow-md">
          <Plus size={20} /> Új típus
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        <div className="relative flex-grow min-w-[200px] w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Keresés név alapján..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none text-sm" />
        </div>
        
        <div className="relative flex-1 md:flex-none">
          <button onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} className="w-full flex justify-between items-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <span className="flex items-center gap-2"><Filter size={14} className="text-gray-500" /> Kategóriák</span> <ChevronDown size={14} />
          </button>
          {openDropdown === 'category' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              {['D1', 'D1m', 'D2', 'U'].map(cat => (
                <div key={cat} onClick={() => toggleSelection(selectedCategories, setSelectedCategories, cat)} className="flex items-center gap-3 px-4 py-3 sm:py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedCategories.includes(cat) ? <CheckSquare size={18} className="text-[#13395C]" /> : <Square size={18} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 md:flex-none">
          <button onClick={() => setOpenDropdown(openDropdown === 'territory' ? null : 'territory')} className="w-full flex justify-between items-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <span className="flex items-center gap-2"><Filter size={14} className="text-gray-500" /> Területek</span> <ChevronDown size={14} />
          </button>
          {openDropdown === 'territory' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              {['Országos', 'Vármegyei'].map(terr => (
                <div key={terr} onClick={() => toggleSelection(selectedTerritories, setSelectedTerritories, terr)} className="flex items-center gap-3 px-4 py-3 sm:py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedTerritories.includes(terr) ? <CheckSquare size={18} className="text-[#13395C]" /> : <Square size={18} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{terr}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 md:flex-none">
          <button onClick={() => setOpenDropdown(openDropdown === 'duration' ? null : 'duration')} className="w-full flex justify-between items-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <span className="flex items-center gap-2"><Filter size={14} className="text-gray-500" /> Érvényesség</span> <ChevronDown size={14} />
          </button>
          {openDropdown === 'duration' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              {['Napi', 'Heti', 'Havi', 'Éves'].map(dur => (
                <div key={dur} onClick={() => toggleSelection(selectedDurations, setSelectedDurations, dur)} className="flex items-center gap-3 px-4 py-3 sm:py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedDurations.includes(dur) ? <CheckSquare size={18} className="text-[#13395C]" /> : <Square size={18} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{dur}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button onClick={clearFilters} className="w-full md:w-auto flex items-center justify-center gap-1 px-3 py-3 sm:py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Szűrők törlése">
          <X size={16} /> Szűrők törlése
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#D3D5D6]/20 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[30%]">Matrica Neve</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Kategória</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Terület</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Érvényesség</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Ár</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[10%] text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? ( <tr><td colSpan="6" className="p-8 text-center text-gray-500">Adatok betöltése...</td></tr> ) : currentStickers.length === 0 ? ( <tr><td colSpan="6" className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő matrica típus.</td></tr> ) : currentStickers.map(st => (
                <tr key={st.id} className="hover:bg-[#D3D5D6]/10 transition-colors">
                  <td className="p-4 font-bold text-gray-800 break-words whitespace-normal" title={st.name}>{st.name}</td>
                  <td className="p-4 font-bold text-gray-600">{st.vehicle_category}</td>
                  <td className="p-4 text-sm text-gray-600">{st.territory}</td>
                  <td className="p-4 text-sm text-gray-600">{st.duration}</td>
                  <td className="p-4 font-mono font-bold text-blue-600">{st.price.toLocaleString()} Ft</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(st)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Szerkesztés"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(st.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg" title="Törlés"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col p-4 gap-4 bg-gray-50/50">
          {loading ? ( <div className="p-8 text-center text-gray-500">Adatok betöltése...</div> ) : currentStickers.length === 0 ? ( <div className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő matrica típus.</div> ) : currentStickers.map(st => (
            <div key={st.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-gray-800 text-lg flex-1 min-w-0 break-words">{st.name}</h3>
                <span className="shrink-0 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{st.vehicle_category}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400 block text-xs">Terület</span><span className="font-medium text-gray-700">{st.territory}</span></div>
                <div><span className="text-gray-400 block text-xs">Érvényesség</span><span className="font-medium text-gray-700">{st.duration}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Ár</span><span className="font-mono font-bold text-blue-600">{st.price.toLocaleString()} Ft</span></div>
              </div>
              <div className="flex justify-end gap-3 mt-2 pt-3 border-t border-gray-50">
                <button onClick={() => openEdit(st)} className="flex items-center justify-center flex-1 gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200"><Edit size={16} /> Szerkeszt</button>
                <button onClick={() => handleDelete(st.id)} className="flex items-center justify-center flex-1 gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100"><Trash2 size={16} /> Töröl</button>
              </div>
            </div>
          ))}
        </div>
        
        {/* JAVÍTÁS: totalItems > 10 így sosem tűnik el a lapozó */}
        {totalItems > 10 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 border-t border-gray-100 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 w-full sm:w-auto">
              <span>Sorok:</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-[#13395C] w-full sm:w-auto">
                <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-sm text-gray-600">
              <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 font-bold shadow-sm">Előző</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 font-bold shadow-sm">Követ</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0 bg-white">
              <h3 className="text-xl font-bold text-gray-800">{formData.id ? 'Típus Szerkesztése' : 'Új Matrica Típus'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Matrica Neve*</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all" placeholder="Pl: D1 Éves Országos" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Kategória*</label>
                  <select required value={formData.vehicle_category} onChange={e => setFormData({...formData, vehicle_category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] bg-white transition-all">
                    <option value="D1">D1</option><option value="D1m">D1m</option><option value="D2">D2</option><option value="U">U</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Időtartam*</label>
                  <select required value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] bg-white transition-all">
                    <option value="Napi">Napi</option><option value="Heti">Heti</option><option value="Havi">Havi</option><option value="Éves">Éves</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Terület*</label>
                  <select required value={formData.territory} onChange={e => setFormData({...formData, territory: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] bg-white transition-all">
                    <option value="Országos">Országos</option><option value="Vármegyei">Vármegyei</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ár (Ft)*</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || ''})} className="w-full p-3 border border-gray-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-[#13395C] transition-all" />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 shrink-0 bg-gray-50">
              <button type="submit" className="w-full py-4 bg-[#13395C] text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-[#0B2C4B] transition-colors shadow-lg">Mentés</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StickerSettings;
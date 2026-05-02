import { useState, useEffect, useRef } from 'react';
import { Ticket, Plus, Search, Edit, Trash2, X, Filter, ChevronDown, Square, CheckSquare } from 'lucide-react';
// ÚJ: Beimportáljuk az API segédfüggvényt
import { apiFetch } from '../api';

const StickerSettings = () => {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Szűrők (Többes kijelöléssel) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTerritories, setSelectedTerritories] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);

  // Lapozás
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // UI Állapotok (Modál és Dropdown)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', vehicle_category: 'D1', duration: 'Napi', territory: 'Országos', price: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const fetchStickers = async () => {
    setLoading(true);
    try {
      // ÚJ: apiFetch használata
      const res = await apiFetch('/sticker-types');
      const data = await res.json();
      setStickers(data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchStickers(); 
    
    // Kattanás figyelése a lenyíló listák bezárásához
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Szűrőváltáskor ugrás az 1. oldalra
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategories, selectedTerritories, selectedDurations]);

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = formData.id !== null;
    const endpoint = isEdit ? `/sticker-types/${formData.id}` : '/sticker-types';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      // ÚJ: apiFetch használata (A headereket automatikusan kezeli az api.js)
      await apiFetch(endpoint, { 
        method, 
        body: JSON.stringify(formData) 
      });
      setIsModalOpen(false);
      fetchStickers();
    } catch (err) { 
      alert('Hiba mentéskor!'); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Biztosan törlöd ezt a matrica típust a katalógusból?')) {
      // ÚJ: apiFetch használata
      await apiFetch(`/sticker-types/${id}`, { method: 'DELETE' });
      fetchStickers();
    }
  };

  const openAdd = () => { setFormData({ id: null, name: '', vehicle_category: 'D1', duration: 'Napi', territory: 'Országos', price: '' }); setIsModalOpen(true); };
  const openEdit = (st) => { setFormData({ ...st }); setIsModalOpen(true); };

  const toggleSelection = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedTerritories([]);
    setSelectedDurations([]);
    setOpenDropdown(null);
  };

  const filteredStickers = stickers.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(st.vehicle_category);
    const matchesTerr = selectedTerritories.length === 0 || selectedTerritories.includes(st.territory);
    const matchesDur = selectedDurations.length === 0 || selectedDurations.includes(st.duration);
    
    return matchesSearch && matchesCat && matchesTerr && matchesDur;
  });

  // Rendezés NÉV alapján
  const sortedStickers = [...filteredStickers].sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = sortedStickers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentStickers = sortedStickers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Matricák</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={20} /> Új típus
        </button>
      </div>

      {/* SZŰRŐSÁV */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        
        {/* 1. Kereső (Matrica neve) */}
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Keresés név alapján..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
          />
        </div>
        
        {/* 2. Kategória */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Kategóriák <ChevronDown size={14} />
          </button>
          {openDropdown === 'category' && (
            <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['D1', 'D1m', 'D2', 'U'].map(cat => (
                <div key={cat} onClick={() => toggleSelection(selectedCategories, setSelectedCategories, cat)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedCategories.includes(cat) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Terület */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'territory' ? null : 'territory')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Területek <ChevronDown size={14} />
          </button>
          {openDropdown === 'territory' && (
            <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['Országos', 'Vármegyei'].map(terr => (
                <div key={terr} onClick={() => toggleSelection(selectedTerritories, setSelectedTerritories, terr)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedTerritories.includes(terr) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{terr}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Érvényesség */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'duration' ? null : 'duration')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Érvényesség <ChevronDown size={14} />
          </button>
          {openDropdown === 'duration' && (
            <div className="absolute top-full right-0 sm:left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['Napi', 'Heti', 'Havi', 'Éves'].map(dur => (
                <div key={dur} onClick={() => toggleSelection(selectedDurations, setSelectedDurations, dur)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedDurations.includes(dur) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{dur}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Állandó Törlés Gomb */}
        <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0" title="Szűrők törlése">
          <X size={16} /> Szűrők törlése
        </button>
      </div>

      {/* TÁBLÁZAT */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-x-auto">
          {/* Itt van a table-fixed varázslat */}
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Százalékosan fixált oszlopszélességek */}
                <th className="p-4 font-semibold text-gray-600 w-[30%]">Matrica Neve</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%]">Kategória</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%]">Terület</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%]">Érvényesség</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%]">Ár</th>
                <th className="p-4 font-semibold text-gray-600 w-[10%] text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? ( <tr><td colSpan="6" className="p-8 text-center text-gray-500">Adatok betöltése...</td></tr> ) : currentStickers.length === 0 ? ( <tr><td colSpan="6" className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő matrica típus.</td></tr> ) : currentStickers.map(st => (
                <tr key={st.id} className="hover:bg-blue-50 transition-colors">
                  {/* A truncate class levágja a nagyon hosszú neveket egy csinos "..."-al */}
                  <td className="p-4 font-bold text-gray-800 truncate" title={st.name}>{st.name}</td>
                  <td className="p-4 font-bold text-gray-600">{st.vehicle_category}</td>
                  <td className="p-4 text-sm text-gray-600">{st.territory}</td>
                  <td className="p-4 text-sm text-gray-600">{st.duration}</td>
                  <td className="p-4 font-mono font-bold text-blue-600">{st.price.toLocaleString()} Ft</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(st)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(st.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Lapozó UI */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl mt-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Sorok:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-lg p-1 bg-white outline-none">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium">Előző</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium">Következő</button>
            </div>
          </div>
        </div>
      </div>

      {/* Létrehozás/Szerkesztés Modál */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">{formData.id ? 'Típus Szerkesztése' : 'Új Matrica Típus'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matrica Neve*</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none" placeholder="Pl: D1 Éves Országos" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategória*</label>
                  <select required value={formData.vehicle_category} onChange={e => setFormData({...formData, vehicle_category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                    <option value="D1">D1</option><option value="D1m">D1m</option><option value="D2">D2</option><option value="U">U</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Időtartam*</label>
                  <select required value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                    <option value="Napi">Napi</option><option value="Heti">Heti</option><option value="Havi">Havi</option><option value="Éves">Éves</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terület*</label>
                  <select required value={formData.territory} onChange={e => setFormData({...formData, territory: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                    <option value="Országos">Országos</option><option value="Vármegyei">Vármegyei</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ár (Ft)*</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || ''})} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-mono" />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm">Mentés</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerSettings;
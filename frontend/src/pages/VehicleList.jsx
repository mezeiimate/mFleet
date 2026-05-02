import { useState, useEffect, useRef } from 'react';
import { Car, Plus, Search, Edit, AlertTriangle, Info, X, Ticket, CheckCircle, Filter, ChevronDown, Square, CheckSquare, Archive, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast'; 
import { apiFetch } from '../api';

const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [stickerTypes, setStickerTypes] = useState([]);
  const [vehicleStickers, setVehicleStickers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]); 
  const [showArchived, setShowArchived] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const [activeModal, setActiveModal] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [formData, setFormData] = useState({ id: null, license_plate: '', brand: '', model: '', year_of_manufacture: new Date().getFullYear(), vin: '', fuel_type: 'Benzin', transmission: 'Manuális', engine_capacity: '', current_km: 0, technical_exam_until: '', user_id: '', category: 'D1', status: 'Aktív' });
  
  // ÚJ: Mező-szintű hibaüzenetek tárolója
  const [fieldErrors, setFieldErrors] = useState({});

  const [errorDesc, setErrorDesc] = useState('');
  const [stickerData, setStickerData] = useState({ sticker_type_id: '', valid_until: '', purchase_price: 0 });
  const [stickerTerritory, setStickerTerritory] = useState('Országos');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/vehicles').then(res => res.json()).catch(() => []),
      apiFetch('/users').then(res => res.json()).catch(() => []),
      apiFetch('/sticker-types').then(res => res.json()).catch(() => [])
    ]).then(([vData, uData, stData]) => {
      setVehicles(Array.isArray(vData) ? vData : []); 
      setUsers(Array.isArray(uData) ? uData.filter(u => u && u.role === 'driver') : []); 
      setStickerTypes(Array.isArray(stData) ? stData : []); 
      setLoading(false);
    }).catch(err => {
      toast.error("Hiba az adatok betöltésekor!");
      setLoading(false);
    });
  };

  useEffect(() => { 
    fetchData(); 
    const handleClickOutside = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategories, selectedDrivers, selectedStatuses, showArchived]);

  const clearFilters = () => {
    setSearchTerm(''); setSelectedCategories([]); setSelectedDrivers([]); setSelectedStatuses([]); setShowArchived(false); setOpenDropdown(null);
  };

  // ÚJ: Objektumot ad vissza, nem egyetlen String-et!
  const validateVehicleData = () => {
    const errors = {};
    const { license_plate, brand, model, year_of_manufacture, vin, engine_capacity, current_km, technical_exam_until } = formData;
    const currentYear = new Date().getFullYear();

    if (!license_plate) {
      errors.license_plate = "A rendszám megadása kötelező!";
    } else {
      const lp = license_plate.replace(/[^A-Z0-9]/g, '');
      const isOldFormat = /^[A-Z]{3}[0-9]{3}$/.test(lp);
      const isNewFormat = /^[A-Z]{4}[0-9]{3}$/.test(lp);

      if (!isOldFormat && !isNewFormat) {
        errors.license_plate = "Érvénytelen formátum (Helyes formátum pl: ABC-123 vagy AABC-123)!";
      } else if (isNewFormat) {
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        const isFirstVowel = vowels.includes(lp[0]);
        const isSecondVowel = vowels.includes(lp[1]);
        if (isFirstVowel !== isSecondVowel) {
          errors.license_plate = "Új típusú, 7 karakterből álló rendszámok esetén az első két karakternek magánhangzónak vagy mássalhangzónak kell lennie (pl. AABC-123).";
        }
      }
    }

    if (!brand) errors.brand = "A márka kötelező!";
    if (!model) errors.model = "A modell kötelező!";
    
    const yearNum = Number(year_of_manufacture);
    if (!year_of_manufacture || yearNum < 1900 || yearNum > currentYear) {
      errors.year_of_manufacture = `Érvénytelen évszám (1900-${currentYear})!`;
    }

    if (!vin || vin.length !== 17) {
      errors.vin = "Pontosan 17 karakterből kell állnia!";
    } else if (yearNum > 1981 && /[IOQ]/i.test(vin)) {
      errors.vin = "Nem tartalmazhat 'I', 'O', vagy 'Q' betűket!";
    }

    if (formData.fuel_type !== 'Elektromos' && (engine_capacity === '' || engine_capacity === null)) {
      errors.engine_capacity = "Hengerűrtartalom kötelező!";
    }
    
    if (current_km === '' || current_km === null) errors.current_km = "Km állás kötelező!";
    if (!technical_exam_until) errors.technical_exam_until = "Műszaki érvényessége kötelező!";

    return Object.keys(errors).length > 0 ? errors : null;
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();

    const errors = validateVehicleData();
    if (errors) {
      setFieldErrors(errors); // Csak megjelenítjük az inputok alatt, NINCS toast!
      return;
    }
    setFieldErrors({}); // Ha minden jó, töröljük a hibákat

    const isEdit = activeModal === 'edit';
    const payload = { ...formData, license_plate: (formData.license_plate || '').replace(/[^A-Z0-9]/g, '') };
    if (!payload.user_id) payload.user_id = null;

    try {
      await apiFetch(isEdit ? `/vehicles/${formData.id}` : '/vehicles', { 
        method: isEdit ? 'PUT' : 'POST', 
        body: JSON.stringify(payload) 
      });
      toast.success(`Jármű sikeresen ${isEdit ? 'módosítva' : 'létrehozva'}!`);
      closeModal(); 
      fetchData();
    } catch (err) {
      toast.error('Szerverhiba történt a mentés során.');
    }
  };

  const handleArchiveToggle = async (v) => {
    if (!v) return;
    if (v.status === 'Szervizben') {
      toast.error('Szervizben lévő autót nem lehet archiválni!');
      return;
    }
    if (window.confirm(`Biztosan ${v.status === 'Archivált' ? 'visszaállítod ezt a járművet Aktív státuszba' : 'archiválod ezt a járművet'}?`)) {
      const payload = { ...v, status: v.status === 'Archivált' ? 'Aktív' : 'Archivált', technical_exam_until: v.technical_exam_until ? v.technical_exam_until.split('T')[0] : null };
      try {
        await apiFetch(`/vehicles/${v.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success(`Jármű sikeresen ${v.status === 'Archivált' ? 'aktiválva' : 'archiválva'}!`);
        fetchData();
      } catch(e) {
        toast.error("Hiba az archiválás során!");
      }
    }
  };

  const handleReportError = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      await apiFetch(`/vehicles/${selectedVehicle.id}/service`, { method: 'POST', body: JSON.stringify({ description: errorDesc }) });
      toast.success('Hiba sikeresen rögzítve a Szerviztáblán!');
      closeModal(); fetchData();
    } catch(e) {
      toast.error('Nem sikerült rögzíteni a hibát.');
    }
  };

  const handleStickerTypeChange = (e) => {
    const selectedType = stickerTypes.find(st => st.id === parseInt(e.target.value));
    let calcDate = '';
    if (selectedType) {
      const d = new Date();
      switch (selectedType.duration) { 
        case 'Napi': calcDate = d.toISOString().split('T')[0]; break; 
        case 'Heti': d.setDate(d.getDate() + 9); calcDate = d.toISOString().split('T')[0]; break; 
        case 'Havi': d.setMonth(d.getMonth() + 1); calcDate = d.toISOString().split('T')[0]; break; 
        case 'Éves': calcDate = `${d.getFullYear() + 1}-01-31`; break; 
        default: calcDate = d.toISOString().split('T')[0]; 
      }
    }
    setStickerData({ ...stickerData, sticker_type_id: e.target.value, purchase_price: selectedType ? selectedType.price : 0, valid_until: calcDate || stickerData.valid_until });
  };

  const handleAddSticker = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      await apiFetch(`/vehicles/${selectedVehicle.id}/stickers`, { method: 'POST', body: JSON.stringify(stickerData) });
      toast.success('Matrica sikeresen hozzáadva!');
      openDetails(selectedVehicle);
    } catch(e) { toast.error("Hiba a matrica hozzáadásakor!"); }
  };

  const handleDeleteSticker = async (stickerId) => {
    if (window.confirm('Biztosan törlöd ezt a matricát az autóról? (Megjegyzés: a pénzügyi történetben a költsége megmarad!)')) { 
      try {
        await apiFetch(`/vehicle-stickers/${stickerId}`, { method: 'DELETE' }); 
        toast.success('Matrica eltávolítva!');
        openDetails(selectedVehicle); 
      } catch(e) { toast.error("Nem sikerült törölni."); }
    }
  };

  const handleClearExpiredStickers = async () => {
    if (window.confirm('Biztosan letörlöd az összes lejárt matricát erről a járműről? A szerviznaptárban a költségek természetesen megmaradnak.')) {
      const todayStr = new Date();
      const safeStickers = Array.isArray(vehicleStickers) ? vehicleStickers : [];
      const expired = safeStickers.filter(vs => new Date(vs.valid_until) < todayStr);
      try {
        for (let st of expired) {
          if (st && st.id) await apiFetch(`/vehicle-stickers/${st.id}`, { method: 'DELETE' });
        }
        toast.success('Lejárt matricák törölve!');
        openDetails(selectedVehicle);
      } catch(e) { toast.error("Hiba a tisztítás során."); }
    }
  };

  const openAdd = () => { 
    const d = new Date(); d.setFullYear(d.getFullYear() + 4);
    const examDate = d.toISOString().split('T')[0]; 
    setFormData({ id: null, license_plate: '', brand: '', model: '', year_of_manufacture: new Date().getFullYear(), vin: '', fuel_type: 'Benzin', transmission: 'Manuális', engine_capacity: '', current_km: 0, technical_exam_until: examDate, user_id: '', category: 'D1', status: 'Aktív' }); 
    setFieldErrors({}); // Hibák ürítése
    setActiveModal('add'); 
  };
  
  const openEdit = (v) => { 
    if (!v) return;
    setSelectedVehicle(v); 
    setFormData({ ...v, technical_exam_until: v.technical_exam_until ? v.technical_exam_until.split('T')[0] : '', user_id: v.user_id || '' }); 
    setFieldErrors({}); // Hibák ürítése
    setActiveModal('edit'); 
  };
  
  const openError = (v) => { if (!v) return; setSelectedVehicle(v); setErrorDesc(''); setActiveModal('error'); };
  
  const openDetails = async (v) => { 
    if (!v) return;
    setSelectedVehicle(v); 
    try {
      const res = await apiFetch(`/vehicles/${v.id}/stickers`); 
      const data = await res.json();
      setVehicleStickers(Array.isArray(data) ? data : []);
    } catch {
      setVehicleStickers([]);
    }
    setActiveModal('details'); 
  };

  const openSticker = () => { setStickerTerritory('Országos'); setStickerData({ sticker_type_id: '', valid_until: '', purchase_price: 0 }); setActiveModal('sticker'); };
  
  const closeModal = () => { setActiveModal(null); setSelectedVehicle(null); setFieldErrors({}); };

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  
  const filteredVehicles = safeVehicles.filter(v => {
    if (!v) return false;
    const lp = v.license_plate || '';
    const brand = v.brand || '';
    const model = v.model || '';

    const matchesSearch = lp.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          model.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(v.category);
    const driverId = v.user_id ? String(v.user_id) : 'unassigned';
    const matchesDriver = selectedDrivers.length === 0 || selectedDrivers.includes(driverId);
    
    let matchesStatus = true;
    if (v.status === 'Archivált') matchesStatus = showArchived; 
    else matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(v.status);

    return matchesSearch && matchesCategory && matchesDriver && matchesStatus;
  });

  const sortedVehicles = [...filteredVehicles].sort((a, b) => (a?.license_plate || '').localeCompare(b?.license_plate || ''));
  const totalItems = sortedVehicles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentVehicles = sortedVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date();
  const safeStickers = Array.isArray(vehicleStickers) ? vehicleStickers : [];
  const activeStickers = safeStickers.filter(vs => vs && new Date(vs.valid_until) >= todayStr);
  const expiredStickers = safeStickers.filter(vs => vs && new Date(vs.valid_until) < todayStr);

  const toggleSelection = (list, setList, value) => setList(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Járművek</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#13395C] text-white px-4 py-2 rounded-lg hover:bg-[#0B2C4B] transition-all shadow-md"><Plus size={20} /> Új jármű</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Rendszám, márka vagy modell..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none text-sm" />
        </div>

        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Kategória <ChevronDown size={14} />
          </button>
          {openDropdown === 'category' && (
            <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['D1', 'D1m', 'D2', 'U'].map(cat => (
                <div key={cat} onClick={() => toggleSelection(selectedCategories, setSelectedCategories, cat)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedCategories.includes(cat) ? <CheckSquare size={16} className="text-[#13395C]" /> : <Square size={16} className="text-gray-300" />} <span className="text-sm font-medium text-gray-700">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'driver' ? null : 'driver')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Sofőr <ChevronDown size={14} />
          </button>
          {openDropdown === 'driver' && (
            <div className="absolute top-full right-0 sm:left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              <div onClick={() => toggleSelection(selectedDrivers, setSelectedDrivers, 'unassigned')} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                {selectedDrivers.includes('unassigned') ? <CheckSquare size={16} className="text-[#13395C]" /> : <Square size={16} className="text-gray-300" />} <span className="text-sm font-medium text-gray-500 italic">Nincs kiosztva</span>
              </div>
              {users.filter(Boolean).map(u => (
                <div key={u.id} onClick={() => toggleSelection(selectedDrivers, setSelectedDrivers, String(u.id))} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedDrivers.includes(String(u.id)) ? <CheckSquare size={16} className="text-[#13395C]" /> : <Square size={16} className="text-gray-300" />} <span className="text-sm font-medium text-gray-700">{u.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Állapot <ChevronDown size={14} />
          </button>
          {openDropdown === 'status' && (
            <div className="absolute top-full right-0 sm:left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['Aktív', 'Szervizben'].map(status => (
                <div key={status} onClick={() => toggleSelection(selectedStatuses, setSelectedStatuses, status)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedStatuses.includes(status) ? <CheckSquare size={16} className="text-[#13395C]" /> : <Square size={16} className="text-gray-300" />} <span className="text-sm font-medium text-gray-700">{status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowArchived(!showArchived)} className={`flex justify-center items-center gap-2 w-48 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${showArchived ? 'bg-[#0B2C4B] text-white border-[#0B2C4B]' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-white'}`}>
          <Archive size={16} /> {showArchived ? 'Archiváltak is' : 'Archiváltak elrejtve'}
        </button>

        <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto xl:ml-0" title="Szűrők törlése">
          <X size={16} /> Szűrők törlése
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
            <thead className="bg-[#D3D5D6]/20 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Rendszám</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[30%]">Jármű adatok</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[20%]">Sofőr</th>
                <th className="p-4 font-semibold text-[#0B2C4B] text-center w-[15%]">Állapot</th>
                <th className="p-4 font-semibold text-[#0B2C4B] text-right w-[20%]">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Adatok betöltése...</td></tr>
              ) : currentVehicles.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő jármű.</td></tr>
              ) : currentVehicles.map(v => {
                if (!v) return null;
                return (
                  <tr key={v.id || Math.random()} className={`hover:bg-[#D3D5D6]/10 transition-colors ${v.status === 'Archivált' ? 'bg-gray-50 opacity-60 grayscale-[0.5]' : ''}`}>
                    <td className="p-4 font-mono font-bold text-gray-800">{v.license_plate || '-'}</td>
                    <td className="p-4 text-sm truncate">
                      <div className="font-medium text-gray-800 truncate" title={`${v.brand || ''} ${v.model || ''}`}>{v.brand || ''} {v.model || ''}</div>
                      <div className="text-gray-500 text-xs">Kat: {v.category || '-'} | Km: {v.current_km != null ? Number(v.current_km).toLocaleString() : '0'}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 truncate" title={v.driver_name || 'Nincs'}>{v.driver_name || <span className="italic text-gray-400">Nincs</span>}</td>
                    <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-medium ${v.status === 'Aktív' ? 'bg-green-100 text-green-700' : v.status === 'Szervizben' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>{v.status || 'Ismeretlen'}</span></td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {/* TOOLTIPEK HOZZÁADVA */}
                        <button onClick={() => openDetails(v)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg" title="Jármű részletei és matricák"><Info size={18} /></button>
                        <button onClick={() => openEdit(v)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Adatok szerkesztése"><Edit size={18} /></button>
                        {v.status === 'Aktív' && <button onClick={() => openError(v)} className="p-2 text-amber-500 hover:bg-amber-100 rounded-lg" title="Hiba bejelentése"><AlertTriangle size={18} /></button>}
                        {v.status !== 'Archivált' ? <button onClick={() => handleArchiveToggle(v)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg" title="Jármű archiválása"><Archive size={18} /></button> : <button onClick={() => handleArchiveToggle(v)} className="p-2 text-green-500 hover:bg-green-100 rounded-lg" title="Jármű visszaállítása (Aktív)"><RefreshCw size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">{activeModal === 'add' ? 'Új Jármű' : activeModal === 'edit' ? 'Jármű Szerkesztése' : activeModal === 'error' ? 'Hiba Bejelentése' : activeModal === 'details' ? 'Jármű Adatlapja' : 'Matrica Vásárlása'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            {(activeModal === 'add' || activeModal === 'edit') && (
              <form onSubmit={handleSaveVehicle} className="p-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
                  {/* INLINE HIBÁK ÉS MAXLENGTH HOZZÁADVA */}
                  <div>
                    <label className="text-sm font-medium">Rendszám*</label>
                    <input required maxLength={7} value={formData.license_plate} onChange={e => {setFormData({...formData, license_plate: e.target.value.toUpperCase()}); setFieldErrors({...fieldErrors, license_plate: null})}} className={`w-full p-2 border rounded-lg font-mono placeholder:text-gray-300 outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.license_plate ? 'border-red-500 bg-red-50' : ''}`} placeholder="Pl: ABCD123 vagy ABC123" />
                    {fieldErrors.license_plate ? <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.license_plate}</p> : <p className="text-[10px] text-gray-500 mt-1">Formátum: 3 betű 3 szám (régi) vagy 4 betű 3 szám (új).</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kategória*</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#13395C]"><option>D1</option><option>D1m</option><option>D2</option><option>U</option></select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Márka*</label>
                    <input required maxLength={50} value={formData.brand} onChange={e => {setFormData({...formData, brand: e.target.value}); setFieldErrors({...fieldErrors, brand: null})}} className={`w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.brand ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.brand && <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.brand}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Modell*</label>
                    <input required maxLength={50} value={formData.model} onChange={e => {setFormData({...formData, model: e.target.value}); setFieldErrors({...fieldErrors, model: null})}} className={`w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.model ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.model && <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.model}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Évjárat*</label>
                    <input required type="number" min="1900" max={new Date().getFullYear()} value={formData.year_of_manufacture} onChange={e => {setFormData({...formData, year_of_manufacture: e.target.value === '' ? '' : parseInt(e.target.value)}); setFieldErrors({...fieldErrors, year_of_manufacture: null})}} className={`w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.year_of_manufacture ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.year_of_manufacture ? <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.year_of_manufacture}</p> : <p className="text-[10px] text-gray-500 mt-1">Érvényes évszám, pl: 2018</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Alvázszám (VIN)*</label>
                    <input required maxLength={17} value={formData.vin} onChange={e => {setFormData({...formData, vin: e.target.value.toUpperCase()}); setFieldErrors({...fieldErrors, vin: null})}} className={`w-full p-2 border rounded-lg uppercase font-mono outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.vin ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.vin ? <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.vin}</p> : <p className="text-[10px] text-gray-500 mt-1">Pontosan 17 karakter. I, O, Q nem szerepelhet benne.</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Üzemanyag*</label>
                    <select required value={formData.fuel_type} onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, fuel_type: val, engine_capacity: val === 'Elektromos' ? 0 : (formData.engine_capacity === 0 ? '' : formData.engine_capacity) });
                      setFieldErrors({...fieldErrors, engine_capacity: null});
                    }} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#13395C]">
                      <option>Benzin</option><option>Dízel</option><option>Elektromos</option><option>Hibrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Váltó*</label>
                    <select required value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#13395C]"><option>Manuális</option><option>Automata</option></select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hengerűrtartalom (cm³)*</label>
                    <input required type="number" min="0" disabled={formData.fuel_type === 'Elektromos'} value={formData.engine_capacity} onChange={e => {setFormData({...formData, engine_capacity: e.target.value === '' ? '' : parseInt(e.target.value)}); setFieldErrors({...fieldErrors, engine_capacity: null})}} className={`w-full p-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-500 outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.engine_capacity ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.engine_capacity ? <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.engine_capacity}</p> : (formData.fuel_type === 'Elektromos' && <p className="text-[10px] text-gray-500 mt-1">Elektromos autó esetén nem releváns.</p>)}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kilométeróra állás*</label>
                    <input required type="number" min="0" value={formData.current_km} onChange={e => {setFormData({...formData, current_km: e.target.value === '' ? '' : parseInt(e.target.value)}); setFieldErrors({...fieldErrors, current_km: null})}} className={`w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.current_km ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.current_km && <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.current_km}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Műszaki érvényessége*</label>
                    <input required type="date" value={formData.technical_exam_until} onChange={e => {setFormData({...formData, technical_exam_until: e.target.value}); setFieldErrors({...fieldErrors, technical_exam_until: null})}} className={`w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-[#13395C] ${fieldErrors.technical_exam_until ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.technical_exam_until && <p className="text-red-500 text-xs mt-1 font-bold">{fieldErrors.technical_exam_until}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sofőr</label>
                    <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#13395C]"><option value="">Nincs kiosztva</option>{users.filter(Boolean).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#13395C] text-white font-bold py-3 rounded-lg hover:bg-[#0B2C4B] transition-colors mt-8 shadow-sm">Mentés</button>
              </form>
            )}

            {activeModal === 'error' && (
              <form onSubmit={handleReportError} className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex gap-3"><AlertTriangle className="shrink-0 mt-0.5" /><p className="text-sm">A hiba bejelentésével a jármű bekerül a szerviznaplóba.</p></div>
                <textarea required rows="4" value={errorDesc} onChange={e => setErrorDesc(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Hiba leírása..."></textarea>
                <button type="submit" className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600">Beküldés</button>
              </form>
            )}

            {activeModal === 'details' && selectedVehicle && (
              <div className="p-6 space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
                    <div>
                      <h4 className="font-black text-2xl tracking-tight">{selectedVehicle.brand || ''} {selectedVehicle.model || ''}</h4>
                      <p className="text-gray-500 text-sm mt-1">Sofőr: <span className="font-bold text-gray-700">{selectedVehicle.driver_name || 'Nincs'}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono bg-white px-4 py-1.5 border rounded-lg text-xl font-bold text-[#0B2C4B]">{selectedVehicle.license_plate || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-sm">
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Kategória</span><span className="font-semibold">{selectedVehicle.category || '-'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Évjárat</span><span className="font-semibold">{selectedVehicle.year_of_manufacture || '-'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Kilométeróra állása</span><span className="font-semibold">{selectedVehicle.current_km != null ? `${Number(selectedVehicle.current_km).toLocaleString()}` : '0'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Alvázszám (VIN)</span><span className="font-mono font-bold text-gray-600">{selectedVehicle.vin || '-'}</span></div>
                    
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Üzemanyag</span><span className="font-semibold">{selectedVehicle.fuel_type || '-'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Váltó</span><span className="font-semibold">{selectedVehicle.transmission || '-'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Hengerűrtartalom</span><span className="font-semibold">{selectedVehicle.engine_capacity != null ? `${selectedVehicle.engine_capacity} cm³` : '-'}</span></div>
                    <div><span className="block text-gray-400 text-xs uppercase mb-1 font-bold">Műszaki érvényessége</span><span className="font-semibold">{selectedVehicle.technical_exam_until ? new Date(selectedVehicle.technical_exam_until).toLocaleDateString('hu-HU') : '-'}</span></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold flex items-center gap-2"><Ticket size={18} /> Érvényes matricák</h4>
                    <button onClick={openSticker} className="text-sm bg-blue-50 text-[#13395C] px-3 py-1 rounded-lg hover:bg-blue-100 font-bold shadow-sm">+ Új matrica</button>
                  </div>
                  
                  {activeStickers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic bg-white p-4 rounded-lg border border-gray-100">Nincs érvényes matrica a járművön.</p>
                  ) : (
                    <ul className="space-y-2 mb-6">
                      {activeStickers.map(vs => (
                        <li key={vs.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-white shadow-sm">
                          <div>
                            <p className="font-bold text-gray-800">{vs.name}</p>
                            <p className="text-xs text-gray-500">Érvényes: <strong className="text-green-600">{new Date(vs.valid_until).toLocaleDateString('hu-HU')}</strong></p>
                          </div>
                          <button onClick={() => handleDeleteSticker(vs.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Matrica eltávolítása"><Trash2 size={18} /></button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {expiredStickers.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold flex items-center gap-2 text-gray-500"><Archive size={18} /> Lejárt matricák ({expiredStickers.length})</h4>
                        <button onClick={handleClearExpiredStickers} className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors font-bold">Minden lejárt törlése</button>
                      </div>
                      <ul className="space-y-2 opacity-70">
                        {expiredStickers.map(vs => (
                          <li key={vs.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-gray-50">
                            <div>
                              <p className="font-bold text-gray-600 line-through decoration-gray-400">{vs.name}</p>
                              <p className="text-xs text-gray-400">Lejárt: <strong className="text-red-500">{new Date(vs.valid_until).toLocaleDateString('hu-HU')}</strong></p>
                            </div>
                            <button onClick={() => handleDeleteSticker(vs.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg" title="Matrica eltávolítása"><Trash2 size={18} /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'sticker' && (
              <form onSubmit={handleAddSticker} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3">1. Hol szeretnéd használni?</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer ${stickerTerritory === 'Országos' ? 'bg-[#D3D5D6]/30 border-[#13395C] text-[#13395C]' : 'border-gray-200'}`}>
                      <input type="radio" name="territory" className="hidden" checked={stickerTerritory === 'Országos'} onChange={() => { setStickerTerritory('Országos'); setStickerData({...stickerData, sticker_type_id: '', purchase_price: 0, valid_until: ''}); }} />
                      <span className="font-bold text-sm">Országos</span>
                    </label>
                    <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer ${stickerTerritory === 'Vármegyei' ? 'bg-[#D3D5D6]/30 border-[#13395C] text-[#13395C]' : 'border-gray-200'}`}>
                      <input type="radio" name="territory" className="hidden" checked={stickerTerritory === 'Vármegyei'} onChange={() => { setStickerTerritory('Vármegyei'); setStickerData({...stickerData, sticker_type_id: '', purchase_price: 0, valid_until: ''}); }} />
                      <span className="font-bold text-sm">Vármegyei</span>
                    </label>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold mb-2">2. Válaszd ki a matricát</label>
                  <select required value={stickerData.sticker_type_id} onChange={handleStickerTypeChange} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-[#13395C]">
                    <option value="">Válassz a listából...</option>
                    {stickerTypes.filter(st => st && selectedVehicle && st.vehicle_category === selectedVehicle.category && st.territory === stickerTerritory).map(st => (
                      <option key={st.id} value={st.id}>{st.name} — {st.price.toLocaleString()} Ft</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><label className="block text-xs font-bold mb-1 uppercase text-gray-500">Vételár (Ft)</label><input type="number" value={stickerData.purchase_price} onChange={e => setStickerData({...stickerData, purchase_price: parseInt(e.target.value) || 0})} className="w-full p-3 border border-gray-200 rounded-xl font-mono focus:border-[#13395C] outline-none" /></div>
                  <div><label className="block text-xs font-bold mb-1 uppercase text-gray-500">Érvényesség vége*</label><input type="date" required value={stickerData.valid_until} onChange={e => setStickerData({...stickerData, valid_until: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#13395C] outline-none" /></div>
                </div>
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => openDetails(selectedVehicle)} className="w-1/3 bg-gray-100 font-bold py-3 rounded-xl hover:bg-gray-200 text-gray-600">Vissza</button>
                  <button type="submit" className="w-2/3 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"><Ticket size={18} /> Rögzítés</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleList;
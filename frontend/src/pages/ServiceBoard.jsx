import { useState, useEffect, useRef } from 'react';
import { Wrench, Search, CheckCircle, Clock, AlertTriangle, Check, Download, Trash2, Tag, Activity, Filter, ChevronDown, Square, CheckSquare, X, Archive, Receipt } from 'lucide-react';
import toast from 'react-hot-toast'; // ÚJ
import { apiFetch } from '../api';

const ServiceBoard = () => {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');   

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [repairCost, setRepairCost] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, vehRes] = await Promise.all([
        apiFetch('/service-logs').then(r => r.json()),
        apiFetch('/vehicles').then(r => r.json())
      ]);
      setLogs(logsRes); setVehicles(vehRes);
    } catch (err) { 
      toast.error('Hiba az adatok betöltésekor.'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
    const handleClickOutside = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedTypes, showArchived, startDate, endDate]);

  const openResolveModal = (log) => { setSelectedLog(log); setRepairCost(''); setIsModalOpen(true); };
  const closeResolveModal = () => { setIsModalOpen(false); setSelectedLog(null); };

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/service-logs/${selectedLog.id}/status`, { 
        method: 'PUT', 
        body: JSON.stringify({ status: 'Kész', vehicle_id: selectedLog.vehicle_id, cost: parseInt(repairCost) || 0 }) 
      });
      toast.success('Javítás sikeresen lezárva!');
      fetchData(); closeResolveModal();
    } catch (err) { toast.error('Hiba a lezárás során!'); }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm(`Biztosan törlöd ezt a tételt a Pénzügyi Történetből? (Ezzel véglegesen törlöd az adott költséget a nyilvántartásból!)`)) {
      try {
        await apiFetch(`/service-logs/${id}`, { method: 'DELETE' });
        toast.success('Tétel sikeresen törölve!');
        fetchData();
      } catch (err) { toast.error('Nem sikerült törölni a tételt.'); }
    }
  };

  let costItems = [];
  logs.filter(log => log.status === 'Kész').forEach(log => {
    const isKmEvent = log.description.includes('Kilométeróra frissítés');
    const isSticker = log.description.startsWith('Matrica:');
    
    let type = 'Szerviz';
    if (isKmEvent) type = 'Esemény';
    if (isSticker) type = 'Matrica';

    const v = vehicles.find(veh => veh.id === log.vehicle_id);
    
    costItems.push({ 
      type: type, 
      id: log.id, 
      plate: log.license_plate, 
      brand: log.brand, 
      model: log.model, 
      description: log.description, 
      cost: log.cost || 0, 
      date: new Date(log.created_at), 
      vehicleStatus: v ? v.status : 'Aktív' 
    });
  });

  costItems.sort((a, b) => b.date - a.date);

  const filteredCosts = costItems.filter(item => {
    const searchString = `${item.plate} ${item.brand} ${item.model} ${item.description}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
    const matchesArchived = showArchived ? true : item.vehicleStatus !== 'Archivált';
    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && item.date >= new Date(startDate);
    if (endDate) { const endD = new Date(endDate); endD.setHours(23, 59, 59, 999); matchesDate = matchesDate && item.date <= endD; }
    return matchesSearch && matchesType && matchesDate && matchesArchived;
  });

  const totalCost = filteredCosts.reduce((sum, item) => sum + item.cost, 0);

  const pendingLogs = logs.filter(log => {
    if (log.status !== 'Folyamatban') return false;
    const searchString = `${log.license_plate} ${log.brand} ${log.model} ${log.description}`.toLowerCase();
    const v = vehicles.find(veh => veh.id === log.vehicle_id);
    const matchesArchived = showArchived ? true : (v ? v.status !== 'Archivált' : true);
    return searchString.includes(searchTerm.toLowerCase()) && matchesArchived;
  });

  const toggleSelection = (list, setList, value) => setList(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);

  const clearFilters = () => { setSearchTerm(''); setSelectedTypes([]); setStartDate(''); setEndDate(''); setShowArchived(false); setOpenDropdown(null); };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "Típus;Rendszám;Jármű;Leírás;Dátum;Költség (Ft)\n";
    
    let sum = 0;
    filteredCosts.forEach(item => { 
      sum += item.cost || 0;
      csvContent += `${item.type};${item.plate};${item.brand} ${item.model};"${item.description}";${item.date.toLocaleDateString('hu-HU')};${item.cost}\n`; 
    });

    csvContent += `Összesen:;;;;;${sum}\n`;

    const encodedUri = encodeURI(csvContent); 
    const link = document.createElement("a"); 
    link.setAttribute("href", encodedUri); 
    link.setAttribute("download", `mFleet_Penzugyek_${new Date().toISOString().slice(0,10)}.csv`); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    toast.success('CSV sikeresen exportálva!');
  };

  const getTypeStyle = (type) => {
    if (type === 'Matrica') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Tag size={16} /> };
    if (type === 'Esemény') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <Activity size={16} /> }; 
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Wrench size={16} /> }; 
  };

  const totalItems = filteredCosts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentCosts = filteredCosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 relative pb-10">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Szerviztábla</h2>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Függőben</p>
              <p className="text-xl font-black text-gray-800 leading-none">{pendingLogs.length} db</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Költségek összesen</p>
              <p className="text-xl font-black text-gray-800 leading-none">{totalCost.toLocaleString('hu-HU')} Ft</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Keresés rendszám, jármű vagy leírás alapján..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none text-sm" />
        </div>
        
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Típusok <ChevronDown size={14} />
          </button>
          {openDropdown === 'type' && (
            <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {['Szerviz', 'Matrica', 'Esemény'].map(t => (
                <div key={t} onClick={() => toggleSelection(selectedTypes, setSelectedTypes, t)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedTypes.includes(t) ? <CheckSquare size={16} className="text-[#13395C]" /> : <Square size={16} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-300">
          <span className="text-gray-500 text-sm font-medium">Tól:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm text-gray-700 outline-none" title="Kezdő dátum kiválasztása" />
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <span className="text-gray-500 text-sm font-medium">Ig:</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm text-gray-700 outline-none" title="Záró dátum kiválasztása" />
        </div>

        <button onClick={() => setShowArchived(!showArchived)} className={`flex justify-center items-center gap-2 w-48 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${showArchived ? 'bg-[#0B2C4B] text-white border-[#0B2C4B]' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-white'}`}>
          <Archive size={16} /> {showArchived ? 'Archiváltak is' : 'Archiváltak elrejtve'}
        </button>

        <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto xl:ml-0" title="Összes szűrő alaphelyzetbe állítása">
          <X size={16} /> Szűrők törlése
        </button>

        {/* ÚJ SZÍN AZ EXPORTRA IS */}
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#13395C] text-white border border-[#0B2C4B] hover:bg-[#0B2C4B] font-bold rounded-lg transition-all shadow-md ml-auto xl:ml-0" title="Táblázat mentése CSV fájlba">
          <Download size={16} /> Export (CSV)
        </button>
      </div>

      {loading ? ( <div className="p-8 text-center text-gray-500 text-lg">Adatok betöltése...</div> ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2"><AlertTriangle className="text-amber-500" size={20} /> Függőben lévő javítások</h2>
            {pendingLogs.length === 0 ? ( <div className="p-6 text-center text-gray-500 text-sm bg-white rounded-xl border border-gray-200 border-dashed">Nincs aktív hibabejelentés.</div> ) : (
              pendingLogs.map(log => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                  <div className="flex justify-between items-start mb-3 pl-3">
                    <div>
                      <div className="text-xl font-black font-mono text-gray-800">{log.license_plate}</div>
                      <div className="text-gray-500 text-sm font-medium">{log.brand} {log.model}</div>
                    </div>
                    <div className="text-gray-400 font-medium text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100">{new Date(log.created_at).toLocaleDateString('hu-HU')}</div>
                  </div>
                  <div className={`p-3 rounded-lg text-sm mb-4 ml-3 border ${log.description === 'Lejárt műszaki' ? 'bg-red-50 text-red-800 border-red-100 font-bold' : 'bg-amber-50/50 text-gray-700 border-amber-100'}`}>"{log.description}"</div>
                  <div className="flex gap-2 ml-3">
                    {/* ÚJ: Ha lejárt műszaki, nem szabad manuálisan törölni, csak a zöld gombbal lezárni! */}
                    {log.description !== 'Lejárt műszaki' && (
                      <button onClick={() => handleDeleteItem(log.id)} className="px-4 py-2 border border-gray-300 text-gray-600 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm transition-colors" title="Javítási feladat törlése">Törlés</button>
                    )}
                    <button onClick={() => openResolveModal(log)} className="flex-1 py-2 bg-green-600 text-white hover:bg-green-700 font-bold rounded-lg text-sm shadow-sm transition-colors" title="Költség megadása és javítás befejezése">{log.description === 'Lejárt műszaki' ? 'Költség megadása és Újra-vizsgáztatás' : 'Javítás lezárása'}</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2"><CheckCircle className="text-green-500" size={20} /> Pénzügyi történet ({filteredCosts.length})</h2>
            <div className="flex flex-col gap-4">
              {filteredCosts.length === 0 ? ( <div className="p-6 text-center text-gray-500 text-sm bg-white rounded-xl border border-gray-200 border-dashed">Nincs a szűrésnek megfelelő tétel.</div> ) : (
                currentCosts.map(item => {
                  const style = getTypeStyle(item.type);
                  return (
                    <div key={`cost_${item.id}`} className={`bg-white border ${item.vehicleStatus === 'Archivált' ? 'border-gray-200 opacity-60 grayscale-[0.5]' : 'border-gray-200'} rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-3`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.vehicleStatus === 'Archivált' ? 'bg-gray-300' : style.border.replace('border-', 'bg-')}`}></div>
                      <div className="flex justify-between items-start pl-3">
                        <div className="overflow-hidden pr-2">
                          <div className="text-lg font-black font-mono text-gray-800 truncate">
                            {item.plate} {item.vehicleStatus === 'Archivált' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1 font-sans">ARCHIVÁLT</span>}
                          </div>
                          <div className="text-gray-500 text-xs font-medium truncate">{item.brand} {item.model}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${style.bg} ${style.text} border ${style.border}`}>{style.icon} {item.type}</div>
                          <div className="text-gray-400 text-xs font-medium">{item.date.toLocaleDateString('hu-HU')}</div>
                        </div>
                      </div>
                      <div className="text-gray-700 text-sm pl-3 line-clamp-3">
                        <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-0.5">{item.type === 'Matrica' ? 'Típus' : 'Leírás'}</span>
                        {item.description}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100 pl-3 mt-1">
                        <div className="text-sm font-medium text-gray-500">Költség: <span className="font-bold text-gray-800 text-base">{item.cost ? item.cost.toLocaleString('hu-HU') : '0'} Ft</span></div>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Költség végleges törlése a Főkönyvből"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalItems > itemsPerPage && (
              <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Sorok:</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-lg p-1 bg-white outline-none focus:border-[#13395C]">
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium transition-colors hover:bg-gray-50">Előző</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium transition-colors hover:bg-gray-50">Következő</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Javítás lezárása</h3>
              <button onClick={closeResolveModal} className="text-gray-400 hover:text-gray-600 transition-colors" title="Ablak bezárása"><X size={24} /></button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{selectedLog.description === 'Lejárt műszaki' ? 'Vizsga hatósági díja (Ft)*' : 'Javítás költsége (Ft)*'}</label>
                <input type="number" min="0" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none font-mono" required />
                <p className="text-[10px] text-gray-500 mt-1">Csak számok megadása megengedett, pl: 25000</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeResolveModal} className="w-1/2 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Mégsem</button>
                <button type="submit" className="w-1/2 py-3 bg-[#13395C] text-white font-bold rounded-xl hover:bg-[#0B2C4B] transition-colors shadow-sm">Kész és Aktiválás</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBoard;
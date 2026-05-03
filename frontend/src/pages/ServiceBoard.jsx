import { useState, useEffect, useRef } from 'react';
import { Wrench, Search, CheckCircle, Clock, AlertTriangle, Check, Download, Trash2, Tag, Activity, Filter, ChevronDown, Square, CheckSquare, X, Archive, Receipt, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../api';

const ServiceBoard = () => {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('pending');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');   

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingItemsPerPage, setPendingItemsPerPage] = useState(10);

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

  useEffect(() => { setCurrentPage(1); setPendingPage(1); }, [searchTerm, selectedTypes, showArchived, startDate, endDate]);

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
    if (window.confirm(`Biztosan törlöd ezt a tételt? (A költség véglegesen törlődik a nyilvántartásból!)`)) {
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
      driver: v ? v.driver_name : 'Nincs kiosztva',
      description: log.description, 
      cost: log.cost || 0, 
      date: new Date(log.created_at), 
      vehicleStatus: v ? v.status : 'Aktív' 
    });
  });

  costItems.sort((a, b) => b.date - a.date);

  const filteredCosts = costItems.filter(item => {
    const searchString = `${item.plate} ${item.brand} ${item.model} ${item.description} ${item.driver}`.toLowerCase();
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
    const v = vehicles.find(veh => veh.id === log.vehicle_id);
    const driverName = v ? v.driver_name : 'Nincs kiosztva';
    const searchString = `${log.license_plate} ${log.brand} ${log.model} ${log.description} ${driverName}`.toLowerCase();
    
    const matchesArchived = showArchived ? true : (v ? v.status !== 'Archivált' : true);
    return searchString.includes(searchTerm.toLowerCase()) && matchesArchived;
  });

  const toggleSelection = (list, setList, value) => setList(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  const clearFilters = () => { setSearchTerm(''); setSelectedTypes([]); setStartDate(''); setEndDate(''); setShowArchived(false); setOpenDropdown(null); };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "Típus;Rendszám;Jármű;Sofőr;Leírás;Dátum;Költség (Ft)\n";
    let sum = 0;
    filteredCosts.forEach(item => { 
      sum += item.cost || 0;
      csvContent += `${item.type};${item.plate};${item.brand} ${item.model};${item.driver};"${item.description}";${item.date.toLocaleDateString('hu-HU')};${item.cost}\n`; 
    });
    csvContent += `Összesen:;;;;;;${sum}\n`;
    const encodedUri = encodeURI(csvContent); 
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `mFleet_Penzugyek_${new Date().toISOString().slice(0,10)}.csv`); 
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success('CSV sikeresen exportálva!');
  };

  const getTypeStyle = (type) => {
    if (type === 'Matrica') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Tag size={16} /> };
    if (type === 'Esemény') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <Activity size={16} /> }; 
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Wrench size={16} /> }; 
  };

  const totalHistoryItems = filteredCosts.length;
  const totalHistoryPages = Math.ceil(totalHistoryItems / itemsPerPage) || 1;
  const currentCosts = filteredCosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPendingItems = pendingLogs.length;
  const totalPendingPages = Math.ceil(totalPendingItems / pendingItemsPerPage) || 1;
  const currentPendingLogs = pendingLogs.slice((pendingPage - 1) * pendingItemsPerPage, pendingPage * pendingItemsPerPage);

  return (
    <div className="space-y-6 relative pb-10">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Szerviztábla</h2>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
          <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3 flex-1 sm:flex-none">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Függőben</p>
              <p className="text-xl font-black text-gray-800 leading-none">{pendingLogs.length} db</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3 flex-1 sm:flex-none">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Költségek Összesen</p>
              <p className="text-xl font-black text-gray-800 leading-none">{totalCost.toLocaleString('hu-HU')} Ft</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        <div className="relative flex-grow min-w-[200px] w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Rendszám, jármű, sofőr vagy leírás..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none text-sm" />
        </div>
        
        <div className="relative flex-1 md:flex-none">
          <button onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')} className="w-full flex justify-between items-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <span className="flex items-center gap-2"><Filter size={14} className="text-gray-500" /> Típusok</span> <ChevronDown size={14} />
          </button>
          {openDropdown === 'type' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              {['Szerviz', 'Matrica', 'Esemény'].map(t => (
                <div key={t} onClick={() => toggleSelection(selectedTypes, setSelectedTypes, t)} className="flex items-center gap-3 px-4 py-3 sm:py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedTypes.includes(t) ? <CheckSquare size={18} className="text-[#13395C]" /> : <Square size={18} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-2 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 w-full md:w-auto">
          <div className="flex w-full sm:w-auto items-center gap-2">
            <span className="text-gray-500 text-sm font-medium w-8 sm:w-auto">Tól:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 bg-transparent text-sm text-gray-700 outline-none p-1 border border-gray-200 sm:border-none rounded bg-white sm:bg-transparent" />
          </div>
          <div className="hidden sm:block w-px h-4 bg-gray-300 mx-1"></div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <span className="text-gray-500 text-sm font-medium w-8 sm:w-auto">Ig:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 bg-transparent text-sm text-gray-700 outline-none p-1 border border-gray-200 sm:border-none rounded bg-white sm:bg-transparent" />
          </div>
        </div>

        <button onClick={() => setShowArchived(!showArchived)} className={`w-full md:w-48 flex justify-center items-center gap-2 px-4 py-3 sm:py-2 border rounded-lg text-sm font-medium transition-all ${showArchived ? 'bg-[#0B2C4B] text-white border-[#0B2C4B]' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-white'}`}>
          <Archive size={16} /> {showArchived ? 'Archiváltak is' : 'Archiváltak rejtve'}
        </button>

        <button onClick={clearFilters} className="w-full md:w-auto flex justify-center items-center gap-1 px-3 py-3 sm:py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Szűrők törlése">
          <X size={16} /> Szűrők törlése
        </button>

        <button onClick={handleExportCSV} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-3 sm:py-2 bg-[#13395C] text-white border border-[#0B2C4B] hover:bg-[#0B2C4B] font-bold rounded-lg transition-all shadow-md ml-auto xl:ml-0">
          <Download size={16} /> Export (CSV)
        </button>
      </div>

      {loading ? ( <div className="p-8 text-center text-gray-500 text-lg font-bold animate-pulse">Adatok betöltése...</div> ) : (
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="flex border-b border-gray-200 bg-gray-50 flex-col sm:flex-row">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-4 sm:py-5 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-white text-amber-600 border-t-4 border-amber-500' : 'text-gray-500 hover:bg-gray-100 border-t-4 border-transparent'}`}>
              <AlertTriangle size={18} /> Függőben lévő ({pendingLogs.length})
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 sm:py-5 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-white text-green-600 border-t-4 border-green-500' : 'text-gray-500 hover:bg-gray-100 border-t-4 border-transparent'}`}>
              <CheckCircle size={18} /> Pénzügyi történet ({filteredCosts.length})
            </button>
          </div>

          <div className="p-4 sm:p-6 bg-gray-50/30">
            
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingLogs.length === 0 ? ( 
                  <div className="p-10 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-200 border-dashed">Nincs aktív hibabejelentés.</div> 
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {currentPendingLogs.map(log => {
                      const v = vehicles.find(veh => veh.id === log.vehicle_id);
                      return (
                        <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden flex flex-col h-full">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                          {/* ÚJ: flex-1 és min-w-0 a hosszú nevekhez */}
                          <div className="flex justify-between items-start mb-3 pl-3 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xl font-black font-mono text-gray-800 break-words">{log.license_plate}</div>
                              <div className="text-gray-500 text-sm font-medium break-words">{log.brand} {log.model}</div>
                              <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1"><User size={12} /> {v?.driver_name || 'Nincs kiosztva'}</div>
                            </div>
                            <div className="shrink-0 text-gray-400 font-medium text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100">{new Date(log.created_at).toLocaleDateString('hu-HU')}</div>
                          </div>
                          <div className={`flex-grow p-4 rounded-xl text-sm mb-4 ml-3 border ${log.description === 'Lejárt műszaki' ? 'bg-red-50 text-red-800 border-red-100 font-bold shadow-inner' : 'bg-amber-50/50 text-gray-700 border-amber-100 shadow-sm'}`}>
                            "{log.description}"
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 ml-3 mt-auto">
                            {log.description !== 'Lejárt műszaki' && (
                              <button onClick={() => handleDeleteItem(log.id)} className="w-full sm:w-auto px-4 py-3 border border-gray-300 text-gray-600 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl text-sm transition-colors shadow-sm">Törlés</button>
                            )}
                            <button onClick={() => openResolveModal(log)} className="w-full flex-1 py-3 bg-green-600 text-white hover:bg-green-700 font-bold rounded-xl text-sm shadow-sm transition-colors">
                              {log.description === 'Lejárt műszaki' ? 'Újra-vizsgáztatás és Díj' : 'Költség megadása & Lezárás'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* JAVÍTÁS: totalPendingItems > 10 így sosem tűnik el a lapozó */}
                {totalPendingItems > 10 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white border border-gray-200 rounded-xl mt-4 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Sorok:</span>
                      <select value={pendingItemsPerPage} onChange={(e) => { setPendingItemsPerPage(Number(e.target.value)); setPendingPage(1); }} className="border border-gray-300 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500">
                        <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 font-medium">
                      <span>{(pendingPage - 1) * pendingItemsPerPage + 1}-{Math.min(pendingPage * pendingItemsPerPage, totalPendingItems)} / {totalPendingItems}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white shadow-sm">Előző</button>
                        <button onClick={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))} disabled={pendingPage === totalPendingPages} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white shadow-sm">Következő</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                {filteredCosts.length === 0 ? ( 
                  <div className="p-10 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-200 border-dashed">Nincs a szűrésnek megfelelő tétel.</div> 
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {currentCosts.map(item => {
                      const style = getTypeStyle(item.type);
                      return (
                        <div key={`cost_${item.id}`} className={`bg-white border ${item.vehicleStatus === 'Archivált' ? 'border-gray-200 opacity-60 grayscale-[0.5]' : 'border-gray-200'} rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col h-full`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.vehicleStatus === 'Archivált' ? 'bg-gray-300' : style.border.replace('border-', 'bg-')}`}></div>
                          {/* ÚJ: flex-1 és min-w-0 a hosszú nevekhez */}
                          <div className="flex justify-between items-start pl-3 mb-2 gap-2">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-lg font-black font-mono text-gray-800 break-words">
                                {item.plate} {item.vehicleStatus === 'Archivált' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1 font-sans align-middle">ARCHIVÁLT</span>}
                              </div>
                              <div className="text-gray-500 text-xs font-medium break-words mt-0.5">{item.brand} {item.model}</div>
                              <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1"><User size={12} /> {item.driver}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className={`flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded ${style.bg} ${style.text} border ${style.border}`}>{style.icon} {item.type}</div>
                              <div className="text-gray-400 text-xs font-bold">{item.date.toLocaleDateString('hu-HU')}</div>
                            </div>
                          </div>
                          <div className="text-gray-700 text-sm pl-3 flex-grow bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-1">{item.type === 'Matrica' ? 'Típus' : 'Leírás'}</span>
                            {item.description}
                          </div>
                          <div className="flex justify-between items-center pt-4 pl-3 mt-2">
                            <div className="text-sm font-medium text-gray-500">Költség: <span className="font-black text-[#0B2C4B] text-lg">{item.cost ? item.cost.toLocaleString('hu-HU') : '0'} Ft</span></div>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-gray-50 border border-gray-100 shadow-sm"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* JAVÍTÁS: totalHistoryItems > 10 így sosem tűnik el a lapozó */}
                {totalHistoryItems > 10 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white border border-gray-200 rounded-xl mt-4 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Sorok:</span>
                      <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-green-500">
                        <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 font-medium">
                      <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalHistoryItems)} / {totalHistoryItems}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white shadow-sm">Előző</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))} disabled={currentPage === totalHistoryPages} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white shadow-sm">Következő</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleResolve} className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0 bg-white">
              <h3 className="text-xl font-bold text-gray-800">Javítás lezárása</h3>
              <button type="button" onClick={closeResolveModal} className="text-gray-400 hover:text-gray-600 p-1"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl mb-4 border border-blue-100">
                <p className="text-sm font-bold mb-1">{selectedLog.license_plate}</p>
                <p className="text-xs">"{selectedLog.description}"</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{selectedLog.description === 'Lejárt műszaki' ? 'Vizsga hatósági díja (Ft)*' : 'Javítás végleges költsége (Ft)*'}</label>
                <input type="number" min="0" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#13395C] outline-none font-mono text-lg transition-all" required placeholder="0" />
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 shrink-0 bg-gray-50 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={closeResolveModal} className="w-full sm:w-1/3 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">Mégsem</button>
              <button type="submit" className="w-full sm:w-2/3 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg">Kész és Aktiválás</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServiceBoard;
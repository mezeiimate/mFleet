import { useState, useEffect } from 'react';
import { Car, AlertTriangle, Ticket, CheckCircle, History, Gauge, LayoutGrid, Info, X } from 'lucide-react';
import toast from 'react-hot-toast'; 
import { apiFetch } from '../api';

const MyCar = ({ user }) => {
  const [vehicles, setVehicles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stickers, setStickers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');
  const [newKm, setNewKm] = useState('');

  const currentVehicle = vehicles[currentIndex];

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/my-cars/${user.id}`);
      const data = await res.json();
      if (data.success && data.vehicles.length > 0) {
        setVehicles(data.vehicles);
      }
    } catch (err) { 
      toast.error('Hiba a járműadatok betöltésekor!'); 
    }
    setLoading(false);
  };

  const fetchVehicleDetails = async (vehicleId) => {
    try {
      const [sRes, lRes] = await Promise.all([
        apiFetch(`/vehicles/${vehicleId}/stickers`),
        apiFetch(`/vehicles/${vehicleId}/logs`)
      ]);
      setStickers(await sRes.json());
      setLogs(await lRes.json());
      setNewKm(vehicles[currentIndex].current_km || '');
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => { fetchInitialData(); }, [user]);
  useEffect(() => { if (currentVehicle) fetchVehicleDetails(currentVehicle.id); }, [currentVehicle, currentIndex]);

  const handleUpdateKm = async () => {
    if (!newKm || parseInt(newKm) < currentVehicle.current_km) {
      toast.error("Hiba: Az új kilométer nem lehet kevesebb a jelenleginél!");
      return;
    }
    try {
      await apiFetch(`/vehicles/${currentVehicle.id}/km`, {
        method: 'PUT',
        body: JSON.stringify({ current_km: newKm })
      });
      toast.success("Kilométeróra állása sikeresen frissítve!");
      fetchInitialData();
    } catch (err) {
      toast.error("Nem sikerült frissíteni a kilométerórát.");
    }
  };

  const handleReportError = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/vehicles/${currentVehicle.id}/service`, {
        method: 'POST',
        body: JSON.stringify({ description: errorDesc })
      });
      toast.success("Hibabejelentés elküldve a Szerviztáblára!");
      setIsErrorModalOpen(false);
      setErrorDesc('');
      fetchInitialData();
    } catch (err) {
      toast.error("Nem sikerült elküldeni a bejelentést.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Járműadatok betöltése...</div>;
  if (vehicles.length === 0) return <div className="text-center p-10 bg-white rounded-xl border border-gray-200 shadow-sm mt-10 max-w-md mx-auto">Nincs hozzád rendelt autó.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      
      {/* Járműválasztó - ÚJ: Vízszintes görgetés mobilon, ha sok autó lenne */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold">
          <LayoutGrid size={20} className="text-[#13395C]" />
          <h3>Válassz járművet:</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {vehicles.map((v, index) => (
            <button
              key={v.id}
              onClick={() => setCurrentIndex(index)}
              className={`shrink-0 px-4 py-2 rounded-xl border-2 transition-all font-mono font-bold text-sm ${
                currentIndex === index 
                ? 'border-[#13395C] bg-[#D3D5D6]/30 text-[#0B2C4B] shadow-sm' 
                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-white'
              }`}
            >
              {v.license_plate}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-full h-2 ${currentVehicle.status === 'Aktív' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <div className="p-5 sm:p-6">
              
              {/* Fejléc - ÚJ: break-words a hosszú nevekhez */}
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0B2C4B] leading-tight break-words">{currentVehicle.brand} {currentVehicle.model}</h3>
                  <p className="text-gray-500 font-medium mt-1">{currentVehicle.category} kategória • {currentVehicle.fuel_type}</p>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${currentVehicle.status === 'Aktív' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {currentVehicle.status}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">ID: #{currentVehicle.id}</span>
                </div>
              </div>

              {/* Részletek rács - ÚJ: break-all az alvázszámnál */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 border-t border-gray-100 pt-6">
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Rendszám</p><p className="font-mono font-bold text-gray-800 text-base">{currentVehicle.license_plate}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Évjárat</p><p className="font-bold text-gray-800 text-base">{currentVehicle.year_of_manufacture || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Váltó</p><p className="font-bold text-gray-800 text-base">{currentVehicle.transmission}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Hengerűrtartalom</p><p className="font-bold text-gray-800">{currentVehicle.engine_capacity ? `${currentVehicle.engine_capacity} cm³` : '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Műszaki érvényessége</p><p className="font-bold text-gray-800">{currentVehicle.technical_exam_until ? new Date(currentVehicle.technical_exam_until).toLocaleDateString('hu-HU') : '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Kategória</p><p className="font-bold text-gray-800">{currentVehicle.category}</p></div>
                <div className="col-span-full"><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Alvázszám (VIN)</p><p className="font-mono text-sm font-bold text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 break-all">{currentVehicle.vin || '-'}</p></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kilométeróra - ÚJ: flex-col mobilon a jobb helykihasználásért */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#D3D5D6] flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-[#13395C] text-white rounded-xl shadow-[#D3D5D6] shadow-lg shrink-0"><Gauge size={24}/></div>
              <div className="flex-grow w-full">
                <label className="block text-[10px] font-black text-[#13395C] uppercase tracking-widest">Kilométeróra frissítése</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="number" 
                    value={newKm} 
                    onChange={e => setNewKm(e.target.value)} 
                    className="w-full text-lg border-b-2 border-[#D3D5D6] outline-none focus:border-[#13395C] font-black text-[#0B2C4B] transition-colors bg-transparent" 
                  />
                  <button onClick={handleUpdateKm} className="bg-[#13395C] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#0B2C4B] transition-colors shrink-0">OK</button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsErrorModalOpen(true)} 
              disabled={currentVehicle.status !== 'Aktív'}
              className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-sm w-full h-full ${
                currentVehicle.status === 'Aktív' 
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <AlertTriangle size={20}/> Hiba bejelentése
            </button>
          </div>
        </div>

        {/* Oldalsó oszlop */}
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
            <h4 className="font-bold flex items-center gap-2 text-[#0B2C4B] mb-4 border-b border-gray-50 pb-2"><Ticket className="text-[#13395C]" size={18}/> Aktív matricák</h4>
            {stickers.length === 0 ? <p className="text-xs text-gray-400 italic">Nincs érvényes matrica.</p> : (
              <div className="space-y-3">
                {stickers.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-700 flex-1 min-w-0 pr-2 break-words">{s.name}</span>
                    <span className="shrink-0 text-[10px] font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200">{new Date(s.valid_until).toLocaleDateString('hu-HU')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
            <h4 className="font-bold flex items-center gap-2 text-[#0B2C4B] mb-4 border-b border-gray-50 pb-2"><History className="text-[#13395C]" size={18}/> Utolsó 5 bejelentés</h4>
            <div className="space-y-4">
              {logs.length === 0 ? <p className="text-xs text-gray-400 italic">Nincs korábbi bejelentés.</p> : logs.map(log => (
                <div key={log.id} className="text-sm group">
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <span className="font-black text-gray-500 text-xs tracking-wider">{new Date(log.created_at).toLocaleDateString('hu-HU')}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${log.status === 'Kész' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{log.status}</span>
                  </div>
                  <p className="text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100 break-words leading-relaxed text-xs">"{log.description}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* MODÁLIS ŰRLAP - ÚJ: Görgethető belső tartalom, fix fej/lábléc */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReportError} className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0 bg-white">
               <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Hiba leírása</h3>
               <button type="button" onClick={() => setIsErrorModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-500 font-medium">A tapasztalt hibajelenség részletes leírása. Ez az üzenet azonnal bekerül a központi Szerviztáblára.</p>
              <textarea 
                required 
                rows="5" 
                value={errorDesc} 
                onChange={e => setErrorDesc(e.target.value)} 
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-amber-500 transition-colors font-medium text-gray-700 resize-none" 
                placeholder="Pl: Indításkor kékes füst, vagy kopogás elölről..." 
              />
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 shrink-0 bg-gray-50 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => setIsErrorModalOpen(false)} className="w-full sm:w-1/3 py-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors shadow-sm">Mégsem</button>
              <button type="submit" className="w-full sm:w-2/3 py-4 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100">Beküldés</button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};

export default MyCar;
import { useState, useEffect } from 'react';
import { Car, AlertTriangle, Ticket, CheckCircle, History, Gauge, LayoutGrid, Info } from 'lucide-react';
// ÚJ: Beimportáljuk az API segédfüggvényt
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
      // ÚJ: Cserélve apiFetch-re
      const res = await apiFetch(`/my-cars/${user.id}`);
      const data = await res.json();
      if (data.success && data.vehicles.length > 0) {
        setVehicles(data.vehicles);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchVehicleDetails = async (vehicleId) => {
    try {
      // ÚJ: Cserélve apiFetch-re
      const [sRes, lRes] = await Promise.all([
        apiFetch(`/vehicles/${vehicleId}/stickers`),
        apiFetch(`/vehicles/${vehicleId}/logs`)
      ]);
      setStickers(await sRes.json());
      setLogs(await lRes.json());
      setNewKm(vehicles[currentIndex].current_km || '');
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInitialData(); }, [user]);
  useEffect(() => { if (currentVehicle) fetchVehicleDetails(currentVehicle.id); }, [currentVehicle, currentIndex]);

  const handleUpdateKm = async () => {
    if (!newKm || parseInt(newKm) < currentVehicle.current_km) {
      alert("Hiba: Az új kilométer nem lehet kevesebb a jelenleginél!");
      return;
    }
    // ÚJ: Cserélve apiFetch-re
    await apiFetch(`/vehicles/${currentVehicle.id}/km`, {
      method: 'PUT',
      body: JSON.stringify({ current_km: newKm })
    });
    alert("Kilométeróra frissítve!");
    fetchInitialData();
  };

  const handleReportError = async (e) => {
    e.preventDefault();
    // ÚJ: Cserélve apiFetch-re
    await apiFetch(`/vehicles/${currentVehicle.id}/service`, {
      method: 'POST',
      body: JSON.stringify({ description: errorDesc })
    });
    setIsErrorModalOpen(false);
    setErrorDesc('');
    fetchInitialData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Járműadatok betöltése...</div>;
  if (vehicles.length === 0) return <div className="text-center p-10 bg-white rounded-xl border border-gray-200 shadow-sm">Nincs hozzád rendelt autó.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Járműválasztó Rács (Nyilak helyett) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold">
          <LayoutGrid size={20} className="text-blue-600" />
          <h3>Válassz járművet:</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {vehicles.map((v, index) => (
            <button
              key={v.id}
              onClick={() => setCurrentIndex(index)}
              className={`px-4 py-2 rounded-xl border-2 transition-all font-mono font-bold text-sm ${
                currentIndex === index 
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-white'
              }`}
            >
              {v.license_plate}
            </button>
          ))}
        </div>
      </div>

      {/* Jármű Részletes Adatlap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`h-2 ${currentVehicle.status === 'Aktív' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 leading-tight">{currentVehicle.brand} {currentVehicle.model}</h3>
                  <p className="text-gray-500 font-medium">{currentVehicle.category} kategória • {currentVehicle.fuel_type}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${currentVehicle.status === 'Aktív' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {currentVehicle.status}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">ID: #{currentVehicle.id}</span>
                </div>
              </div>

              {/* Bővített Technikai Adatok Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 border-t border-gray-100 pt-6">
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Rendszám</p><p className="font-mono font-bold text-gray-800">{currentVehicle.license_plate}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Évjárat</p><p className="font-bold text-gray-800">{currentVehicle.year_of_manufacture || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Váltó</p><p className="font-bold text-gray-800">{currentVehicle.transmission}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Hengerűrtartalom</p><p className="font-bold text-gray-800">{currentVehicle.engine_capacity ? `${currentVehicle.engine_capacity} cm³` : '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Műszaki érvényessége</p><p className="font-bold text-gray-800">{currentVehicle.technical_exam_until ? new Date(currentVehicle.technical_exam_until).toLocaleDateString('hu-HU') : '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Kategória</p><p className="font-bold text-gray-800">{currentVehicle.category}</p></div>
                <div className="col-span-full"><p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Alvázszám (VIN)</p><p className="font-mono text-sm font-bold text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">{currentVehicle.vin || '-'}</p></div>
              </div>
            </div>
          </div>

          {/* Gyorsműveletek: KM és Hiba */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-blue-200 shadow-lg"><Gauge size={24}/></div>
              <div className="flex-grow">
                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">Kilométeróra frissítése</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="number" 
                    value={newKm} 
                    onChange={e => setNewKm(e.target.value)} 
                    className="w-full text-lg border-b-2 border-blue-200 outline-none focus:border-blue-600 font-black text-gray-800 transition-colors" 
                  />
                  <button onClick={handleUpdateKm} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700">OK</button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsErrorModalOpen(true)} 
              disabled={currentVehicle.status !== 'Aktív'}
              className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-sm ${
                currentVehicle.status === 'Aktív' 
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <AlertTriangle size={20}/> Hiba bejelentése
            </button>
          </div>
        </div>

        {/* Oldalsáv: Matricák és Előzmények */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h4 className="font-bold flex items-center gap-2 text-gray-800 mb-4 border-b border-gray-50 pb-2"><Ticket className="text-blue-500" size={18}/> Aktív matricák</h4>
            {stickers.length === 0 ? <p className="text-xs text-gray-400 italic">Nincs érvényes matrica.</p> : (
              <div className="space-y-2">
                {stickers.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{s.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200">{new Date(s.valid_until).toLocaleDateString('hu-HU')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h4 className="font-bold flex items-center gap-2 text-gray-800 mb-4 border-b border-gray-50 pb-2"><History className="text-purple-500" size={18}/> Utolsó 5 bejelentés</h4>
            <div className="space-y-3">
              {logs.length === 0 ? <p className="text-xs text-gray-400 italic">Nincs korábbi bejelentés.</p> : logs.map(log => (
                <div key={log.id} className="text-xs group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black text-gray-700">{new Date(log.created_at).toLocaleDateString('hu-HU')}</span>
                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${log.status === 'Kész' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{log.status}</span>
                  </div>
                  <p className="text-gray-500 italic line-clamp-2 leading-relaxed">"{log.description}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Hiba Modal */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <h3 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Hiba leírása</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">A tapasztalt hibajelenség részletes leírása.</p>
            <textarea required rows="4" value={errorDesc} onChange={e => setErrorDesc(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-6 outline-none focus:border-amber-500 transition-colors font-medium text-gray-700" placeholder="Pl: Indításkor kékes füst, vagy kopogás elölről..." />
            <div className="flex gap-3">
              <button onClick={() => setIsErrorModalOpen(false)} className="w-1/2 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">Mégsem</button>
              <button onClick={handleReportError} className="w-1/2 py-3 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100">Beküldés</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCar;
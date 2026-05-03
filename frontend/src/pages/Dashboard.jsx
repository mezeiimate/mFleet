import { useState, useEffect } from 'react';
import { Car, Wrench, AlertTriangle, ShieldAlert, Clock, CheckCircle, Fuel, LayoutGrid, Calendar } from 'lucide-react';
import { apiFetch } from '../api';

const Dashboard = () => {
  const [vehicles, setVehicles] = useState([]);
  const [serviceLogs, setServiceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [vehRes, logRes] = await Promise.all([
          apiFetch('/vehicles').then(r => r.json()),
          apiFetch('/service-logs').then(r => r.json())
        ]);

        const activeVehicles = vehRes.filter(v => v.status !== 'Archivált');
        const stickersPromises = activeVehicles.map(v => 
          apiFetch(`/vehicles/${v.id}/stickers`).then(r => r.json()).then(stickers => ({ ...v, stickers }))
        );
        const vehiclesWithStickers = await Promise.all(stickersPromises);

        setVehicles(vehRes);
        setServiceLogs(logRes);

        const newAlerts = [];
        const today = new Date();
        const thirtyDaysLimit = new Date(); thirtyDaysLimit.setDate(today.getDate() + 30);
        const sevenDaysLimit = new Date(); sevenDaysLimit.setDate(today.getDate() + 7);

        vehiclesWithStickers.forEach(v => {
          const activeLog = logRes.find(l => l.vehicle_id === v.id && l.status === 'Folyamatban');

          if (v.status === 'Szervizben') {
            const isLejartMuszaki = activeLog && activeLog.description === 'Lejárt műszaki';

            newAlerts.push({
              id: `srv-${v.id}`, 
              priority: isLejartMuszaki ? 4 : 2, 
              title: isLejartMuszaki ? 'LEJÁRT MŰSZAKI (SZERVIZBEN)' : 'SZERVIZELÉS FOLYAMATBAN', 
              plate: v.license_plate, 
              carInfo: `${v.brand} ${v.model}`, 
              driver: v.driver_name || 'Nincs kiosztva',
              issue: activeLog ? activeLog.description : 'Ismeretlen hiba',
              dateLabel: isLejartMuszaki ? 'Lejárt:' : 'Bejelentve:', 
              dateValue: isLejartMuszaki 
                ? (v.technical_exam_until ? new Date(v.technical_exam_until).toLocaleDateString('hu-HU') : '-')
                : (activeLog ? new Date(activeLog.created_at).toLocaleDateString('hu-HU') : '-'),
              icon: isLejartMuszaki ? <ShieldAlert size={24} className="text-red-600" /> : <Wrench size={24} className="text-orange-500" />, 
              bg: isLejartMuszaki ? 'bg-red-50' : 'bg-orange-50', 
              text: isLejartMuszaki ? 'text-red-800' : 'text-orange-800'
            });
          }

          if (v.technical_exam_until) {
            const examDate = new Date(v.technical_exam_until);
            if (examDate <= thirtyDaysLimit && examDate >= today && v.status !== 'Szervizben') {
              newAlerts.push({
                id: `tech-warn-${v.id}`, priority: 1, title: 'KÖZELEDŐ MŰSZAKI VIZSGA',
                plate: v.license_plate, carInfo: `${v.brand} ${v.model}`, driver: v.driver_name || 'Nincs kiosztva',
                issue: 'Műszaki vizsga',
                dateLabel: 'Lejár:', dateValue: examDate.toLocaleDateString('hu-HU'),
                icon: <Clock size={24} className="text-amber-500" />, bg: 'bg-amber-50', text: 'text-amber-800'
              });
            }
          }

          if (v.stickers) {
            v.stickers.forEach(st => {
              const stDate = new Date(st.valid_until);
              if (stDate < today) {
                newAlerts.push({
                  id: `st-exp-${st.id}`, priority: 3, title: 'LEJÁRT AUTÓPÁLYA MATRICA',
                  plate: v.license_plate, carInfo: `${v.brand} ${v.model}`, driver: v.driver_name || 'Nincs kiosztva',
                  issue: `${st.name} (${st.territory})`,
                  dateLabel: 'Lejárt:', dateValue: stDate.toLocaleDateString('hu-HU'),
                  icon: <AlertTriangle size={24} className="text-red-500" />, bg: 'bg-red-50', text: 'text-red-800'
                });
              } else if (stDate <= sevenDaysLimit && stDate >= today) {
                newAlerts.push({
                  id: `st-warn-${st.id}`, priority: 1, title: 'MATRICA LEJÁRAT KÖZELI',
                  plate: v.license_plate, carInfo: `${v.brand} ${v.model}`, driver: v.driver_name || 'Nincs kiosztva',
                  issue: `${st.name} (${st.territory})`,
                  dateLabel: 'Lejár:', dateValue: stDate.toLocaleDateString('hu-HU'),
                  icon: <Clock size={24} className="text-blue-500" />, bg: 'bg-blue-50', text: 'text-blue-800'
                });
              }
            });
          }
        });
        setAlerts(newAlerts.sort((a, b) => b.priority - a.priority));
      } catch (err) { 
        console.error("Hiba:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-bold">Adatok betöltése...</div>;

  const activeFleet = vehicles.filter(v => v.status !== 'Archivált');

  const totalVehs = activeFleet.length;
  const activeVehs = activeFleet.filter(v => v.status === 'Aktív').length;
  const serviceVehs = activeFleet.filter(v => v.status === 'Szervizben').length;
  const alertCount = alerts.length; 

  const fuelStats = activeFleet.reduce((acc, v) => { acc[v.fuel_type] = (acc[v.fuel_type] || 0) + 1; return acc; }, {});
  const catStats = activeFleet.reduce((acc, v) => { acc[v.category] = (acc[v.category] || 0) + 1; return acc; }, {});

  const todayFormatted = new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  const totalItems = alerts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentAlerts = alerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 pb-10 text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0B2C4B]">Áttekintés</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-600 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm mt-4 md:mt-0">
          <Calendar size={18} className="text-[#13395C]" />
          <span className="font-bold text-sm capitalize">{todayFormatted}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Aktív Flotta</p>
          <div className="flex justify-between items-end">
            <span className="text-4xl font-black text-[#0B2C4B]">{totalVehs}</span>
            <div className="p-2 bg-[#D3D5D6]/30 text-[#13395C] rounded-lg"><Car size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Menetkész</p>
          <div className="flex justify-between items-end">
            <span className="text-4xl font-black text-green-600">{activeVehs}</span>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Szervizben</p>
          <div className="flex justify-between items-end">
            <span className="text-4xl font-black text-orange-500">{serviceVehs}</span>
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Wrench size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Összes riasztás</p>
          <div className="flex justify-between items-end">
            <span className="text-4xl font-black text-red-600">{alertCount}</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
            <Fuel className="text-[#13395C]" size={20} />
            <h2 className="font-bold text-lg text-[#0B2C4B]">Üzemanyag típusok</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(fuelStats).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span>{type}</span>
                  <span className="text-slate-400">{totalVehs > 0 ? Math.round((count/totalVehs)*100) : 0}% ({count} db)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#13395C] h-full rounded-full transition-all duration-500" style={{ width: `${totalVehs > 0 ? (count/totalVehs)*100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
            <LayoutGrid className="text-[#13395C]" size={20} />
            <h2 className="font-bold text-lg text-[#0B2C4B]">Jármű kategóriák</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(catStats).map(([cat, count]) => (
              <div key={cat} className="bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center border border-gray-100">
                <span className="text-3xl font-black text-[#13395C]">{count}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center gap-2 border-b border-gray-100">
          <AlertTriangle className="text-red-500" size={20} />
          <h2 className="font-bold text-lg text-[#0B2C4B]">Sürgős teendők ({alerts.length} db)</h2>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {alerts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle size={40} className="mx-auto text-green-400 mb-2" />
              <p className="text-gray-500 font-medium">Minden feladat elvégezve.</p>
            </div>
          ) : (
            currentAlerts.map(alert => (
              <div key={alert.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-xl border-l-4 transition-all hover:translate-x-1 ${alert.bg} border-l-current shadow-sm`}>
                <div className="flex gap-4 items-start w-full sm:w-auto">
                  <div className="shrink-0 mt-1">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-black uppercase tracking-tight mb-2 break-words ${alert.text}`}>{alert.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700 mb-1">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">{alert.plate}</span>
                      <span className="font-bold break-words">{alert.carInfo}</span>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <span>Sofőr: <span className="font-bold text-gray-900">{alert.driver}</span></span>
                    </div>
                    <div className="text-sm font-medium text-slate-800 break-words">
                      <span className="text-gray-500 mr-1">Probléma:</span> {alert.issue}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 w-full sm:w-auto text-left sm:text-right bg-white/60 px-4 py-2 rounded-lg border border-gray-200/50 min-w-[130px]">
                  <span className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-0.5">{alert.dateLabel}</span>
                  <span className={`block text-sm font-black ${alert.text}`}>{alert.dateValue}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* ÚJ: Lapozó 10 elem felett mindig látszik, és mobilon flex-col */}
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
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 font-bold shadow-sm transition-colors hover:bg-gray-50">Előző</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 font-bold shadow-sm transition-colors hover:bg-gray-50">Követ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
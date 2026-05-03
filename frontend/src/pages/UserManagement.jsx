import { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, Trash2, Edit, UserPlus, X, Filter, ChevronDown, Square, CheckSquare, Shield, User as UserIcon, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../api';

const UserManagement = ({ loggedInUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, username: '', password: '', name: '', role: 'driver' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) { 
      toast.error('Nem sikerült betölteni a felhasználókat.'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRoles]);

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = formData.id !== null;
    const endpoint = isEdit ? `/users/${formData.id}` : '/users';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = { ...formData };
    if (isEdit && !payload.password) delete payload.password;

    try {
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      toast.success(`Felhasználó sikeresen ${isEdit ? 'módosítva' : 'létrehozva'}!`);
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) { 
      toast.error(err.message || 'Hiba mentéskor!'); 
    }
  };

  const handleDelete = async (id, role) => {
    if (role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
      toast.error('Az utolsó adminisztrátor nem törölhető!');
      return;
    }
    if (window.confirm('Biztosan törlöd ezt a felhasználót?')) {
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        toast.success('Felhasználó sikeresen törölve!');
        fetchUsers();
      } catch (err) {
        toast.error('Nem sikerült törölni a felhasználót.');
      }
    }
  };

  const openAdd = () => { setFormData({ id: null, username: '', password: '', name: '', role: 'driver' }); setIsModalOpen(true); };
  const openEdit = (user) => { setFormData({ id: user.id, username: user.username, password: '', name: user.name, role: user.role }); setIsModalOpen(true); };

  const toggleRole = (role) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const clearFilters = () => { setSearchTerm(''); setSelectedRoles([]); setOpenDropdown(null); };

  const filteredUsers = users.filter(u => {
    const searchString = `${u.name} ${u.username}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(u.role);
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRoleStyle = (role) => {
    switch (role) {
      case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin', icon: <ShieldAlert size={14} /> };
      case 'operator': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Operátor', icon: <Shield size={14} /> };
      default: return { bg: 'bg-green-100', text: 'text-green-700', label: 'Sofőr', icon: <UserIcon size={14} /> };
    }
  };

  if (loggedInUser && loggedInUser.role !== 'admin') {
    return <div className="p-10 text-center text-red-500 font-bold bg-white rounded-xl shadow-sm border border-gray-200">Nincs jogosultságod ehhez az oldalhoz!</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-[#13395C]" /> Felhasználók</h2>
        <button onClick={openAdd} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-[#13395C] text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-[#0B2C4B] transition-all shadow-md">
          <UserPlus size={20} /> Új felhasználó
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        <div className="relative flex-grow min-w-[200px] w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Keresés név vagy felhasználónév alapján..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13395C] outline-none text-sm" />
        </div>
        
        <div className="relative flex-1 md:flex-none">
          <button onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')} className="w-full flex justify-between items-center gap-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <span className="flex items-center gap-2"><Filter size={14} className="text-gray-500" /> Szerepkörök</span> <ChevronDown size={14} />
          </button>
          {openDropdown === 'role' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2 max-h-60 overflow-y-auto">
              {[
                { id: 'admin', label: 'Admin' },
                { id: 'operator', label: 'Operátor' },
                { id: 'driver', label: 'Sofőr' }
              ].map(r => (
                <div key={r.id} onClick={() => toggleRole(r.id)} className="flex items-center gap-3 px-4 py-3 sm:py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedRoles.includes(r.id) ? <CheckSquare size={18} className="text-[#13395C]" /> : <Square size={18} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{r.label}</span>
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
        
        {/* ASZTALI NÉZET: Táblázat */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#D3D5D6]/20 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[35%]">Név</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[35%]">Felhasználónév</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%]">Szerepkör</th>
                <th className="p-4 font-semibold text-[#0B2C4B] w-[15%] text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? ( <tr><td colSpan="4" className="p-8 text-center text-gray-500">Adatok betöltése...</td></tr> ) : currentUsers.length === 0 ? ( <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő felhasználó.</td></tr> ) : currentUsers.map(user => {
                const roleStyle = getRoleStyle(user.role);
                return (
                  <tr key={user.id} className="hover:bg-[#D3D5D6]/10 transition-colors">
                    <td className="p-4 font-bold text-gray-800 break-words">{user.name}</td>
                    <td className="p-4 text-gray-600 font-mono text-sm break-words">{user.username}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${roleStyle.bg} ${roleStyle.text}`}>
                        {roleStyle.icon} {roleStyle.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(user)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Szerkesztés"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(user.id, user.role)} disabled={loggedInUser?.id === user.id} className="p-2 text-red-500 hover:bg-red-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Törlés"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBIL NÉZET: Kártyák */}
        <div className="md:hidden flex flex-col p-4 gap-4 bg-gray-50/50">
          {loading ? ( <div className="p-8 text-center text-gray-500">Adatok betöltése...</div> ) : currentUsers.length === 0 ? ( <div className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő felhasználó.</div> ) : currentUsers.map(user => {
            const roleStyle = getRoleStyle(user.role);
            return (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg break-words">{user.name}</h3>
                    <p className="text-sm font-mono text-gray-500 break-words">{user.username}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleStyle.bg} ${roleStyle.text}`}>
                    {roleStyle.icon} {roleStyle.label}
                  </span>
                </div>
                <div className="flex justify-end gap-3 mt-2 pt-3 border-t border-gray-50">
                  <button onClick={() => openEdit(user)} className="flex items-center justify-center flex-1 gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200"><Edit size={16} /> Szerkeszt</button>
                  <button onClick={() => handleDelete(user.id, user.role)} disabled={loggedInUser?.id === user.id} className="flex items-center justify-center flex-1 gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-red-50"><Trash2 size={16} /> Töröl</button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Lapozó */}
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
              <h3 className="text-xl font-bold text-gray-800">{formData.id ? 'Felhasználó Szerkesztése' : 'Új Felhasználó'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Teljes Név*</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all" placeholder="Pl: Kiss Péter" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Felhasználónév (Azonosító)*</label>
                <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full p-3 border border-gray-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-[#13395C] transition-all" placeholder="Pl: kisspeter" />
                <p className="text-[10px] text-gray-500 mt-1">Kisbetűk, szóköz nélkül.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Szerepkör*</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] bg-white transition-all">
                  <option value="driver">Sofőr</option>
                  <option value="operator">Operátor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Jelszó {formData.id && '(Hagyd üresen, ha nem változik)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!formData.id} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all" placeholder="********" />
                <p className="text-[10px] text-gray-500 mt-1">Minimum 6 karakter ajánlott.</p>
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

export default UserManagement;
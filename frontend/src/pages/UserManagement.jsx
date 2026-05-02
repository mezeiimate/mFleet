import { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, Trash2, Edit, CheckCircle, UserPlus, X, Filter, ChevronDown, Square, CheckSquare } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Szűrők
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Lapozás
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modál és Dropdown állapotok
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, username: '', password: '', name: '', role: 'driver' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchUsers(); 
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Szűrőváltáskor ugrás az 1. oldalra
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRoles]);

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = formData.id !== null;
    const url = isEdit ? `http://localhost:5001/api/users/${formData.id}` : 'http://localhost:5001/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) { alert('Hiba mentéskor!'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Biztosan törlöd ezt a felhasználót?')) {
      await fetch(`http://localhost:5001/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
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

  // Rendezés NÉV alapján
  const sortedUsers = [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-100 text-red-700">Admin</span>;
      case 'operator': return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-100 text-purple-700">Operátor</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-green-100 text-green-700">Sofőr</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Felhasználók</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"><UserPlus size={20} /> Új felhasználó</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center" ref={filterRef}>
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Keresés név vagy felhasználónév alapján..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        
        {/* Checkboxos Szerepkör Szűrő */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm hover:bg-white transition-colors">
            <Filter size={14} className="text-gray-500" /> Szerepkörök <ChevronDown size={14} />
          </button>
          {openDropdown === 'role' && (
            <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-2">
              {[
                { id: 'admin', label: 'Admin' },
                { id: 'operator', label: 'Operátor' },
                { id: 'driver', label: 'Sofőr' }
              ].map(r => (
                <div key={r.id} onClick={() => toggleRole(r.id)} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  {selectedRoles.includes(r.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />} 
                  <span className="text-sm font-medium text-gray-700">{r.label}</span>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-x-auto">
          {/* BEÁLLÍTOTTUK A table-fixed CLASS-T */}
          <table className="w-full text-left border-collapse min-w-[600px] table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* OSZLOPSZÉLESSÉGEK KŐBE VÉSVE */}
                <th className="p-4 font-semibold text-gray-600 w-[35%]">Név</th>
                <th className="p-4 font-semibold text-gray-600 w-[35%]">Felhasználónév</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%]">Szerepkör</th>
                <th className="p-4 font-semibold text-gray-600 w-[15%] text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? ( <tr><td colSpan="4" className="p-8 text-center text-gray-500">Adatok betöltése...</td></tr> ) : currentUsers.length === 0 ? ( <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">Nincs a szűrésnek megfelelő felhasználó.</td></tr> ) : currentUsers.map(user => (
                <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                  {/* TRUNCATE CLASS A HOSSZÚ SZÖVEGEK ELVÁGÁSÁRA */}
                  <td className="p-4 font-bold text-gray-800 truncate" title={user.name}>{user.name}</td>
                  <td className="p-4 text-gray-600 font-mono text-sm truncate" title={user.username}>{user.username}</td>
                  <td className="p-4">{renderRoleBadge(user.role)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Szerkesztés"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg" title="Törlés"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalItems > itemsPerPage && (
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl mt-auto">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Sorok:</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded-lg p-1 bg-white outline-none">
                <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}</span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium">Előző</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 font-medium">Következő</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">{formData.id ? 'Felhasználó Szerkesztése' : 'Új Felhasználó'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teljes Név*</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Felhasználónév*</label>
                <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Szerepkör*</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                  <option value="admin">Admin</option>
                  <option value="operator">Operátor</option>
                  <option value="driver">Sofőr</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jelszó {formData.id && '(Hagyd üresen, ha nem változik)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!formData.id} className="w-full p-3 border border-gray-300 rounded-lg outline-none" />
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

export default UserManagement;
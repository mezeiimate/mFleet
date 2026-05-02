import { useState } from 'react';
import { User, KeyRound, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast'; // ÚJ: Értesítések importálása
import { apiFetch } from '../api';

const Profile = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('A két jelszó nem egyezik meg!');
      return;
    }

    try {
      const response = await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: user.username,
          name: formData.name,
          role: user.role, 
          password: formData.password || undefined 
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profil adatok sikeresen frissítve!');
        if (onUserUpdate) {
          onUserUpdate({ ...user, name: formData.name });
        }
        setFormData({ ...formData, password: '', confirmPassword: '' });
      } else {
        toast.error('Hiba történt a mentés során.');
      }
    } catch (err) {
      toast.error('Nem sikerült elérni a szervert.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-[#13395C]/10 text-[#13395C] rounded-xl">
          <User size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profil beállítások</h2>
          <p className="text-sm text-gray-500">Személyes adatok és biztonság kezelése.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-inner text-[#13395C]">
              <User size={40} />
            </div>
            <h3 className="font-bold text-gray-800">{user.name}</h3>
            <p className="text-xs text-gray-400 font-mono mb-4">@{user.username}</p>
            
            <div className="pt-4 border-t border-gray-50 flex flex-col items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                user.role === 'operator' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
              }`}>
                <Shield size={12} /> {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Megjelenített név</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all font-medium"
                />
                <p className="text-[10px] text-gray-500 mt-1">Ezen a néven fogsz megjelenni a rendszerben.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
                  <KeyRound size={18} className="text-[#13395C]" />
                  <h4>Jelszó módosítása</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Új jelszó</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jelszó újra</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13395C] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic">Hagyd üresen, ha nem akarod megváltoztatni a jelszavadat. (Minimum 6 karakter ajánlott!)</p>
              </div>

              <button
                type="submit"
                className="w-full bg-[#13395C] text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-[#0B2C4B] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                title="Személyes adatok és jelszó véglegesítése"
              >
                <Save size={18} />
                Módosítások mentése
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
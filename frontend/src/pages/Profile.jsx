import { useState } from 'react';
import { User, KeyRound, Save, Shield, BadgeCheck, AlertCircle } from 'lucide-react';
// ÚJ: Beimportáljuk az API segédfüggvényt
import { apiFetch } from '../api';

const Profile = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Jelszó ellenőrzés
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'A két jelszó nem egyezik meg!' });
      return;
    }

    try {
      // ÚJ: Cserélve apiFetch-re (a headereket automatikusan kezeli az api.js)
      const response = await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: user.username,
          name: formData.name,
          role: user.role, // A saját szerepkörét nem módosíthatja itt
          password: formData.password || undefined // Csak akkor küldjük, ha beírta
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Profil sikeresen frissítve!' });
        // Frissítjük a globális user állapotot is, hogy a fejlécben is változzon a név
        if (onUserUpdate) {
          onUserUpdate({ ...user, name: formData.name });
        }
        setFormData({ ...formData, password: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: 'Hiba történt a mentés során.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Nem sikerült elérni a szervert.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <User size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profil beállítások</h2>
          <p className="text-sm text-gray-500">Személyes adatok és biztonság kezelése.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bal oldali kártya: Infó */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-inner text-blue-600">
              <User size={40} />
            </div>
            <h3 className="font-bold text-gray-800">{user.name}</h3>
            <p className="text-xs text-gray-400 font-mono mb-4">@{user.username}</p>
            
            <div className="pt-4 border-t border-gray-50 flex flex-col items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                user.role === 'operator' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <Shield size={12} /> {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Jobb oldali kártya: Szerkesztés */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <BadgeCheck size={20} /> : <AlertCircle size={20} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Megjelenített név</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
                  <KeyRound size={18} className="text-blue-600" />
                  <h4>Jelszó módosítása</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Új jelszó</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jelszó újra</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic">Hagyd üresen, ha nem akarod megváltoztatni a jelszavadat.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
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
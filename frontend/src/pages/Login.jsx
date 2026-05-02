import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        onLogin(data.user);
        toast.success(`Üdvözlünk, ${data.user.name}!`); 
        navigate('/'); 
      }
    } catch (err) {
      // Itt már nem fog frissülni az oldal, a toast látható marad!
      toast.error(err.message || 'Hibás felhasználónév vagy jelszó!');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#D3D5D6] w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black mb-2 tracking-tighter"><span className="text-[#0B2C4B]">m</span><span className="text-[#13395C]">Fleet</span></h1>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight mt-4">Bejelentkezés</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Felhasználónév</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#D3D5D6] rounded-xl focus:ring-2 focus:ring-[#13395C] outline-none transition-all font-medium"
                placeholder="pl. admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Jelszó</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#D3D5D6] rounded-xl focus:ring-2 focus:ring-[#13395C] outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#13395C] text-white font-bold text-lg py-3 rounded-xl hover:bg-[#0B2C4B] transition-colors shadow-lg hover:shadow-xl"
          >
            Belépés
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-[#0B2C4B] p-4 bg-[#D3D5D6]/20 rounded-xl border border-[#D3D5D6]/50">
          <p className="font-bold mb-2">Teszt fiókok:</p>
          <ul className="space-y-1 font-medium">
            <li>Adminisztrátor: <strong>admin</strong></li>
            <li>Operátor: <strong>operator</strong></li>
            <li>Sofőr: <strong>sofor</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
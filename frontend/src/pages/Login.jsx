import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, User } from 'lucide-react';
import toast from 'react-hot-toast'; // ÚJ: Értesítések importálása
import { apiFetch } from '../api'; // ÚJ: API helper importálása

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // ÚJ: A hardcoded URL lecserélve!
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        onLogin(data.user);
        toast.success(`Üdvözlünk, ${data.user.name}!`); // ÚJ: Sikeres felugró ablak!
        navigate('/'); 
      }
    } catch (err) {
      // Mivel az api.js most már dobja a hibákat (throw new Error), itt elegáns toastot adunk!
      toast.error(err.message || 'Hibás felhasználónév vagy jelszó!');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo imitáció kékkel és szürkével */}
          <h1 className="text-4xl font-black mb-2"><span className="text-[#001A33]">m</span><span className="text-[#C8C9CA]">Fleet</span></h1>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Jelentkezz be!</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Felhasználónév</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#001A33] outline-none transition-all"
                placeholder="pl. admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jelszó</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#001A33] outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            // ÚJ DIZÁJN: Mélykék gomb!
            className="w-full bg-[#001A33] text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-colors shadow-md hover:shadow-lg"
          >
            Bejelentkezés
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-semibold mb-2">Teszt fiókok:</p>
          <ul className="space-y-1">
            <li>Adminisztrátor: <strong className="text-gray-700">admin</strong></li>
            <li>Operátor: <strong className="text-gray-700">operator</strong></li>
            <li>Sofőr: <strong className="text-gray-700">sofor</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
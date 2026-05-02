import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, User, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // --- ÚJ LOGIKA: A token elmentése a böngészőbe ---
        localStorage.setItem('token', data.token); // Eltároljuk a tokent!
        
        onLogin(data.user); // Átadjuk a user adatokat a szülő komponensnek (App.jsx)
        navigate('/'); 
      } else {
        setError(data.message || 'Hibás bejelentkezési adatok');
      }
    } catch (err) {
      setError('Nem sikerült csatlakozni a szerverhez.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Üdvözlünk!</h2>
          <p className="text-gray-500 mt-2">Jelentkezz be a flottakezelőbe</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Felhasználónév</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            Bejelentkezés
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
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
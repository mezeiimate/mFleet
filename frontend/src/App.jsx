import { useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import VehicleList from './pages/VehicleList';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import MyCar from './pages/MyCar';
import ServiceBoard from './pages/ServiceBoard';
import StickerSettings from './pages/StickerSettings';
import Profile from './pages/Profile';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fleet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('fleet_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fleet_user');
  };

  const handleProfileClick = () => {
    if (user.role === 'admin') {
      navigate('/felhasznalok');
    } else {
      navigate('/profil');
    }
    setIsMobileMenuOpen(false);
  };

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // Menüpontok legenerálása a Role alapján
  const navLinks = [];
  if (user.role === 'admin' || user.role === 'operator') {
    navLinks.push({ to: "/", label: "Vezérlőpult" });
    navLinks.push({ to: "/jarmuvek", label: "Járművek" });
    navLinks.push({ to: "/szerviz", label: "Szerviztábla" });
    navLinks.push({ to: "/matricak", label: "Matricák" });
  }
  if (user.role === 'admin') {
    navLinks.push({ to: "/felhasznalok", label: "Felhasználók" });
  }
  if (user.role === 'driver') {
    navLinks.push({ to: "/sajat-auto", label: "Saját autóm" });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Bal oldal: Logó és Desktop Menü */}
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600 tracking-tight">mFleet</span>
              <div className="hidden md:flex ml-10 space-x-6">
                {navLinks.map(link => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    className={`px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
                      location.pathname === link.to ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Jobb oldal: Profil és Hamburger Gomb */}
            <div className="flex items-center space-x-4">
              {/* Kattintható profil */}
              <button 
                onClick={handleProfileClick}
                className="hidden md:flex items-center text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                title="Profil megtekintése"
              >
                <UserIcon size={16} className="mr-2 text-blue-600" />
                {user.name} ({user.role === 'admin' ? 'Admin' : user.role === 'operator' ? 'Operátor' : 'Sofőr'})
              </button>
              
              <button onClick={handleLogout} className="hidden md:block text-gray-400 hover:text-red-600" title="Kijelentkezés">
                <LogOut size={20} />
              </button>

              {/* Mobil Hamburger gomb */}
              <button 
                className="md:hidden p-2 text-gray-600"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobil lenyíló menü */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-4 pt-4">
              <button onClick={handleProfileClick} className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600">
                Profil beállítások ({user.name})
              </button>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50">
                Kijelentkezés
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Routes>
                    {/* Admin / Operátor útvonalak */}
            {(user.role === 'admin' || user.role === 'operator') && (
                <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/jarmuvek" element={<VehicleList />} />
                <Route path="/szerviz" element={<ServiceBoard />} />
                <Route path="/matricak" element={<StickerSettings />} />
                </>
            )}
            
            {/* Csak Admin útvonal */}
            {user.role === 'admin' && <Route path="/felhasznalok" element={<UserManagement />} />}
            
            {/* Csak Sofőr útvonal */}
            {user.role === 'driver' && <Route path="/sajat-auto" element={<MyCar user={user} />} />}

            {/* Közös Profil oldal - mindenki számára elérhető legyen */}
            <Route path="/profil" element={<Profile user={user} onUserUpdate={handleLogin} />} />
            
            <Route path="*" element={<Navigate to={user.role === 'driver' ? '/sajat-auto' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

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
    const token = localStorage.getItem('token');
    return (saved && token) ? JSON.parse(saved) : null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('fleet_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fleet_user');
    localStorage.removeItem('token');
  };

  const handleProfileClick = () => {
    if (user.role === 'admin') {
      navigate('/felhasznalok');
    } else {
      navigate('/profil');
    }
  };

  if (!user) {
    return (
      <div className="bg-[#D3D5D6]/30 min-h-screen">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#D3D5D6]/40 text-gray-900 font-sans">
      
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 4000, 
          style: { fontWeight: 'bold', borderRadius: '12px', padding: '16px' } 
        }} 
      />

      <nav className="bg-[#0B2C4B] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            <div className="flex items-center">
              {/* ÚJ: Kattintható logó, ami a jogosultságnak megfelelő kezdőlapra visz */}
              <Link 
                to={user.role === 'driver' ? '/sajat-auto' : '/'} 
                className="text-2xl font-black text-white tracking-tight hover:text-gray-200 transition-colors"
              >
                mFleet
              </Link>

              <div className="hidden lg:flex ml-10 space-x-6">
                {navLinks.map(link => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    className={`px-1 pt-1 text-sm font-bold border-b-4 transition-colors ${
                      location.pathname === link.to 
                      ? 'border-[#D3D5D6] text-[#D3D5D6]' 
                      : 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={handleProfileClick}
                className="hidden lg:flex items-center text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors cursor-pointer"
                title="Profil megtekintése"
              >
                <UserIcon size={16} className="mr-2 text-[#D3D5D6]" />
                {user.name} ({user.role === 'admin' ? 'Admin' : user.role === 'operator' ? 'Operátor' : 'Sofőr'})
              </button>
              
              <button onClick={handleLogout} className="hidden lg:block text-gray-400 hover:text-[#D3D5D6] hover:bg-white/10 p-2 rounded-full transition-colors" title="Kijelentkezés">
                <LogOut size={20} />
              </button>

              <button 
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#13395C] border-t border-white/10 px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === link.to ? 'text-[#0B2C4B] bg-[#D3D5D6]' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 mt-4 pt-4">
              <button onClick={handleProfileClick} className="w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-white">
                Profil beállítások ({user.name})
              </button>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-base font-medium text-[#D3D5D6] hover:bg-white/10">
                Kijelentkezés
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Routes>
            {(user.role === 'admin' || user.role === 'operator') && (
                <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/jarmuvek" element={<VehicleList />} />
                <Route path="/szerviz" element={<ServiceBoard />} />
                <Route path="/matricak" element={<StickerSettings />} />
                </>
            )}
            {user.role === 'admin' && <Route path="/felhasznalok" element={<UserManagement loggedInUser={user} />} />}
            {user.role === 'driver' && <Route path="/sajat-auto" element={<MyCar user={user} />} />}
            <Route path="/profil" element={<Profile user={user} onUserUpdate={handleLogin} />} />
            <Route path="*" element={<Navigate to={user.role === 'driver' ? '/sajat-auto' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

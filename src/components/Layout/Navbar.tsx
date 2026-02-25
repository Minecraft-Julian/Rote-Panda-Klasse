import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Calendar, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/messenger', icon: <MessageSquare size={20} />, label: 'Messenger' },
    { to: '/klassenliste', icon: <Users size={20} />, label: 'Klassenliste' },
    { to: '/stundenplan', icon: <Calendar size={20} />, label: 'Stundenplan' },
    { to: '/hausaufgaben', icon: <BookOpen size={20} />, label: 'Hausaufgaben' },
  ];

  return (
    <nav className="bg-white border-b-2 border-red-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-2">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-red-600 mr-4 shrink-0">
          <span className="text-xl">🐼</span>
          <span className="hidden sm:inline">Roter Panda</span>
        </NavLink>

        <div className="flex items-center gap-1 flex-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-100 text-red-600'
                    : 'text-gray-600 hover:bg-red-50 hover:text-red-500'
                }`
              }
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-red-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
              {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-700 hidden sm:block truncate max-w-[120px]">
            {currentUser?.displayName || currentUser?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50"
            title="Abmelden"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}

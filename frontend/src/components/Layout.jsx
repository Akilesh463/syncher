import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HiOutlineHome, HiOutlineCalendar, HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight, HiOutlineHeart,
  HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle,
  HiOutlineBars3, HiOutlineXMark, HiOutlinePencilSquare
} from 'react-icons/hi2';
import './Layout.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/log', label: 'Daily Log', icon: HiOutlinePencilSquare },
  { path: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
  { path: '/lifestyle', label: 'Lifestyle', icon: HiOutlineHeart },
  { path: '/chat', label: 'AI Assistant', icon: HiOutlineChatBubbleLeftRight },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
            <div className="logo-icon">S</div>
            {!collapsed && <span className="logo-text">SYNCHER</span>}
          </div>
          <button className="sidebar-toggle mobile-close" onClick={() => setMobileOpen(false)}>
            <HiOutlineXMark />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user.username}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <HiOutlineArrowRightOnRectangle className="nav-icon" />
            {!collapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="main-header">
          <button className="sidebar-toggle" onClick={() => {
            if (window.innerWidth <= 768) {
              setMobileOpen(true);
            } else {
              setCollapsed(!collapsed);
            }
          }}>
            <HiOutlineBars3 />
          </button>
          <div className="header-right">
            <div className="header-greeting">
              Welcome back, <span className="text-gradient">{user?.username || 'there'}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

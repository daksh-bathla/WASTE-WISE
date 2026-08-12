import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from './Button';

const publicLinks = [
  { label: 'Features', target: 'features' },
  { label: 'How it works', target: 'how-it-works' },
  { label: 'Community', target: 'community-proof' },
];

const appLinks = [
  { label: 'Home', path: '/home' },
  { label: 'Scan', path: '/scan' },
  { label: 'Log', path: '/log' },
  { label: 'Community', path: '/community' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  const scrollToSection = (target) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: target } });
      setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/');
  };

  const initials = (user?.name || 'WW')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border-light bg-white/75 backdrop-blur-xl">
      <div className="page-shell flex h-full items-center justify-between">
        <Link to={user ? '/home' : '/'}>
          <img src="/wastewise-logo.svg" alt="WasteWise" className="h-10 w-auto" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {user
            ? appLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </button>
              ))
            : publicLinks.map((link) => (
                <button key={link.target} type="button" className="nav-link" onClick={() => scrollToSection(link.target)}>
                  {link.label}
                </button>
              ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 backdrop-blur-md px-2 py-2 shadow-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep-purple text-sm font-extrabold text-white">
                  {initials}
                </span>
                <span className="max-w-[120px] truncate text-sm font-bold text-text-primary">{user.name || 'Profile'}</span>
                <ChevronDown size={16} className="text-text-muted" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-border bg-white/90 backdrop-blur-xl p-2 shadow-hover">
                  {[
                    { label: 'My Profile', path: '/profile' },
                    { label: 'Scrap Log', path: '/log' },
                    { label: 'Community', path: '/community' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-text-secondary hover:bg-light-purple hover:text-deep-purple"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-danger hover:bg-[#FFF0EE]"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="icon-button md:hidden"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-b border-border-light bg-white/90 backdrop-blur-xl px-4 py-4 shadow-card md:hidden">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            {user ? (
              <>
                {appLinks.map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    className="rounded-xl px-3 py-3 text-left font-bold text-text-secondary hover:bg-light-purple"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(link.path);
                    }}
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-xl px-3 py-3 text-left font-bold text-text-secondary hover:bg-light-purple"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                >
                  Profile
                </button>
                <Button variant="secondary" onClick={handleLogout} className="mt-2 w-full">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <button
                    key={link.target}
                    type="button"
                    className="rounded-xl px-3 py-3 text-left font-bold text-text-secondary hover:bg-light-purple"
                    onClick={() => scrollToSection(link.target)}
                  >
                    {link.label}
                  </button>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => navigate('/login')}>
                    Login
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/signup')}>
                    Get started
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

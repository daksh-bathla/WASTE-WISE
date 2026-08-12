import { Camera, FileText, Home, User, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Camera, label: 'Scan', path: '/scan' },
  { icon: FileText, label: 'Log', path: '/log' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border-light bg-white/75 backdrop-blur-xl">
      <div className="mx-auto grid h-full max-w-4xl grid-cols-5">
        {tabs.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (path === '/scan' && location.pathname.startsWith('/results'));
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                isActive ? 'text-deep-purple' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon size={21} strokeWidth={isActive ? 2.8 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

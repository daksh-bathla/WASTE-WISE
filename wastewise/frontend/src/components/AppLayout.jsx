import { BottomNav, Navbar } from './ui';

export default function AppLayout({ children, showBottomNav = true, className = '' }) {
  return (
    <div className={`min-h-screen ${className}`}>
      <Navbar />
      <main className={`app-main ${showBottomNav ? 'with-bottom-nav' : ''}`}>{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

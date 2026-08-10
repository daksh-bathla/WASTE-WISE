import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, [location.pathname]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #52b788, #3a9b6a)',
        zIndex: 9999,
        transition: 'width 80ms linear',
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px rgba(82,183,136,0.5)',
      }}
    />
  );
}

import { useLocation } from 'react-router-dom';

export default function MobileShell({ children, tabBar }) {
  const { pathname } = useLocation();
  return (
    <div className={`mobile${tabBar ? ' with-tabbar' : ''}`}>
      <div key={pathname} className="page-enter flex flex-1 flex-col min-h-0">
        {children}
      </div>
      {tabBar}
    </div>
  );
}

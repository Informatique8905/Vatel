export default function MobileShell({ children, tabBar }) {
  return (
    <div className={`mobile${tabBar ? ' with-tabbar' : ''}`}>
      {children}
      {tabBar}
    </div>
  );
}

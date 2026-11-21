import { NavLink } from 'react-router-dom';
import Icon from './Icon';

const ACTIVE_FILL = { fill: '#072A5D', stroke: '#072A5D' };

export default function TabBar({ items }) {
  return (
    <nav className="tabbar" aria-label="Navigation">
      {items.map((it) =>
        it.to ? (
          <NavLink key={it.label} to={it.to} end={it.end} className={({ isActive }) => `tab${isActive ? ' on' : ''}`}>
            {({ isActive }) => (
              <>
                <Icon
                  name={it.icon}
                  sw={isActive && !it.activeFill ? 2.2 : undefined}
                  style={isActive && it.activeFill ? ACTIVE_FILL : undefined}
                />
                {it.label}
              </>
            )}
          </NavLink>
        ) : (
          <a key={it.label} className="tab" href="#">
            <Icon name={it.icon} />
            {it.label}
          </a>
        ),
      )}
    </nav>
  );
}

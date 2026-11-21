import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function BackLink({ to }) {
  return (
    <div className="px-3 pt-[52px]">
      <Link to={to} aria-label="Retour" className="w-12 h-12 text-ink flex items-center justify-center">
        <Icon name="chevronLeft" />
      </Link>
    </div>
  );
}

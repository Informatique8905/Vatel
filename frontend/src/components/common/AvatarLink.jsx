import { Link } from 'react-router-dom';
import Icon from './Icon';

const CLS = 'w-[60px] h-[60px] rounded-[30px] bg-tint text-marine flex items-center justify-center';

export default function AvatarLink({ to, label }) {
  return to ? (
    <Link to={to} aria-label={label} className={CLS}><Icon name="user" /></Link>
  ) : (
    <span role="img" aria-label={label} className={CLS}><Icon name="user" /></span>
  );
}

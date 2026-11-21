const ON = { background: '#fff', color: '#1D1D1B', boxShadow: '0 1px 3px rgba(0,0,0,.12)' };
const OFF = { background: 'transparent', color: '#5C5C5C' };

export default function Segmented({ options, value, onChange, label, className = '' }) {
  return (
    <div className={`seg ${className}`} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={o.id === value} onClick={() => onChange(o.id)} style={o.id === value ? ON : OFF}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function RadioDot({ on, filled = false }) {
  return (
    <span
      className={`w-6 h-6 rounded-[12px] flex-none ${on ? `border-[7px] border-marine${filled ? ' bg-white' : ''}` : 'border-2 border-idle'}`}
    />
  );
}

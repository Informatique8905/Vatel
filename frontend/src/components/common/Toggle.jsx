export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`w-[51px] h-[31px] p-0.5 rounded-[16px] cursor-pointer flex transition-[background] duration-200 ${checked ? 'justify-end bg-marine' : 'justify-start bg-line'}`}
    >
      <span className="w-[27px] h-[27px] rounded-[14px] bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)]" />
    </button>
  );
}

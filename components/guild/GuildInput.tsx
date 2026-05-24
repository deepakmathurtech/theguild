type Props = {
  label: string;
  placeholder?: string;
  type?: string;

  value?: string;

  disabled?: boolean;

  onChange?: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export default function GuildInput({
  label,
  placeholder,
  type = "text",
  value,
  disabled,
  onChange,
}: Props) {
  return (
    <div>

      <label
        className="
          mb-2
          block
          text-[10px]
          tracking-[0.22em]
          text-zinc-700
          sm:mb-3
          sm:text-xs
          sm:tracking-[0.3em]
        "
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full
          min-h-12
          border-b-2
          border-black/20
          bg-transparent
          pb-3
          text-base
          italic
          outline-none
          placeholder:text-zinc-500
          focus:border-[#8c5d17]
          disabled:opacity-70
          sm:text-xl
          lg:text-2xl
        "
      />

    </div>
  );
}

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
          mb-3
          block
          text-xs
          tracking-[0.3em]
          text-zinc-700
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
          border-b-2
          border-black/20
          bg-transparent
          pb-3
          text-2xl
          italic
          outline-none
          placeholder:text-zinc-500
          focus:border-[#8c5d17]
          disabled:opacity-70
        "
      />

    </div>
  );
}
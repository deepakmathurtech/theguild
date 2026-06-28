import { Loader } from 'lucide-react';

interface GuildLoadingProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: { wrap: 'p-4', icon: 'w-4 h-4', text: 'text-[10px]' },
  md: { wrap: 'p-8', icon: 'w-5 h-5', text: 'text-xs' },
  lg: { wrap: 'p-12', icon: 'w-7 h-7', text: 'text-sm' }
};

export default function GuildLoading({ label = 'Loading...', size = 'md', className = '' }: GuildLoadingProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center text-[var(--text-muted)] ${sizes.wrap} ${className}`}>
      <Loader className={`animate-spin text-[var(--primary)] ${sizes.icon}`} />
      <p className={`${sizes.text} font-bold uppercase tracking-widest`}>{label}</p>
    </div>
  );
}

import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (fullName?: string | null): string => {
    if (!fullName || !fullName.trim()) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8 text-[11px]',
    md: 'w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm',
    lg: 'w-11 h-11 sm:w-12 sm:h-12 text-sm sm:text-base',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 text-xl font-bold',
  };

  const showImage = src && !imgError;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-mono font-medium shadow-2xs ${sizeClasses[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="select-none tracking-wider font-mono">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};

export default Avatar;

'use client';

interface Props {
  streakDays: number;
  size?: number;
}

export default function StreakFlame({ streakDays, size = 32 }: Props) {
  const isActive = streakDays > 0;

  if (!isActive) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="No streak">
        <path
          d="M16 4C16 4 10 10 10 17C10 20.866 12.686 24 16 24C19.314 24 22 20.866 22 17C22 14 20 11 18 9C18 11 17 13 16 14C16 14 14 12 14 10C14 8 16 4 16 4Z"
          fill="var(--text-tertiary)"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label={`${streakDays} day streak`}
      className="streak-active"
    >
      <defs>
        <linearGradient id="flame-gradient" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="60%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#FF3B3B" />
        </linearGradient>
      </defs>

      {/* Outer flame */}
      <path
        d="M16 3C16 3 8 11 8 18.5C8 23.194 11.582 27 16 27C20.418 27 24 23.194 24 18.5C24 14.5 21 11 19 8.5C19 11 17.5 13.5 16 15C16 15 13 12.5 13 9.5C13 7 16 3 16 3Z"
        fill="url(#flame-gradient)"
      />

      {/* Inner glow */}
      <path
        d="M16 13C16 13 13.5 16.5 13.5 19.5C13.5 21.433 14.567 23 16 23C17.433 23 18.5 21.433 18.5 19.5C18.5 17.5 17 16 16 14.5C16 14.5 15 16 14.5 17C14.5 17 13.5 15.5 13.5 14C13.5 12.5 16 13 16 13Z"
        fill="rgba(255, 255, 255, 0.5)"
      />
    </svg>
  );
}

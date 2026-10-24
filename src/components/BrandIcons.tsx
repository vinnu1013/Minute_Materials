import React, { useId } from 'react';

interface IconProps {
  className?: string;
}

/**
 * Official WhatsApp speech-bubble + handset glyph (white/currentColor)
 */
export const WhatsAppGlyph: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.968 0 1.758.459 3.474 1.332 4.988L2 22l5.188-1.361a9.927 9.927 0 0 0 4.841 1.258h.004c5.515 0 9.967-4.453 9.967-9.968A9.907 9.907 0 0 0 19.08 4.918 9.905 9.905 0 0 0 12.031 2zm5.822 14.129c-.246.693-1.434 1.326-1.989 1.41-.509.076-1.152.108-1.859-.117-.429-.136-.979-.318-1.685-.623-2.966-1.281-4.903-4.267-5.051-4.465-.148-.197-1.206-1.605-1.206-3.061 0-1.456.763-2.172 1.034-2.468.271-.296.591-.37.788-.37.197 0 .394.002.567.01.182.009.426-.069.667.509.246.592.838 2.048.912 2.196.074.148.123.321.025.518-.099.198-.148.321-.296.494-.148.173-.311.386-.444.518-.148.148-.302.309-.13.605.173.296.766 1.264 1.645 2.047 1.131 1.008 2.084 1.321 2.38 1.469.296.148.469.123.642-.074.173-.197.739-.863.936-1.159.197-.296.394-.247.665-.148.271.099 1.725.814 2.021.962.296.148.493.222.567.345.074.124.074.716-.172 1.409z" />
  </svg>
);

/**
 * Authentic WhatsApp rounded square badge (#25D366 + white glyph)
 */
export const WhatsAppBadgeIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect width="48" height="48" rx="11" fill="#25D366" />
    <path
      fill="#FFFFFF"
      d="M24.05 9.5c-7.98 0-14.45 6.47-14.45 14.45 0 2.55.67 5.04 1.93 7.23L9.5 38.5l7.52-1.97a14.4 14.4 0 0 0 7.02 1.82h.01c7.98 0 14.45-6.47 14.45-14.45 0-3.86-1.5-7.49-4.23-10.22A14.36 14.36 0 0 0 24.05 9.5zm8.44 20.49c-.36 1-2.08 1.92-2.88 2.04-.74.11-1.67.16-2.7-.17-.62-.2-1.42-.46-2.44-.9-4.3-1.86-7.11-6.19-7.32-6.47-.22-.29-1.75-2.33-1.75-4.44 0-2.11 1.11-3.15 1.5-3.58.39-.43.86-.54 1.14-.54.29 0 .57 0 .82.01.26.01.62-.1.97.74.36.86 1.22 2.97 1.32 3.18.11.22.18.47.04.75-.14.29-.22.47-.43.72-.22.25-.45.56-.64.75-.22.21-.44.45-.19.88.25.43 1.11 1.83 2.38 2.97 1.64 1.46 3.02 1.91 3.45 2.13.43.21.68.18.93-.11.25-.29 1.07-1.25 1.36-1.68.29-.43.57-.36.96-.21.39.14 2.5 1.18 2.93 1.39.43.22.72.32.82.5.11.18.11 1.04-.25 2.04z"
    />
  </svg>
);

/**
 * Authentic Instagram multi-stop radial gradient badge + camera glyph
 */
export const InstagramBadgeIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => {
  const gradId = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="11" fill={`url(#${gradId})`} />
      <rect
        x="11.5"
        y="11.5"
        width="25"
        height="25"
        rx="7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.8"
      />
      <circle
        cx="24"
        cy="24"
        r="5.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.8"
      />
      <circle cx="31.2" cy="16.8" r="1.7" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * Authentic Phone Call app icon badge (#007AFF blue + white handset glyph)
 */
export const CallBadgeIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect width="48" height="48" rx="11" fill="#007AFF" />
    <path
      fill="#FFFFFF"
      d="M34.62 29.88c-1.76-.15-3.48-.53-5.11-1.14a2.12 2.12 0 0 0-2.16.47l-2.72 2.73a21.9 21.9 0 0 1-8.57-8.57l2.73-2.72a2.12 2.12 0 0 0 .47-2.16 17.56 17.56 0 0 1-1.14-5.11A2.14 2.14 0 0 0 16 11.45h-4.1A2.15 2.15 0 0 0 9.75 13.6c0 12.51 10.14 22.65 22.65 22.65a2.15 2.15 0 0 0 2.15-2.15V32a2.14 2.14 0 0 0-1.93-2.12z"
    />
  </svg>
);

/**
 * Official Google Gmail 5-color 'M' logo on crisp white badge
 */
export const GmailBadgeIcon: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect width="48" height="48" rx="11" fill="#FFFFFF" />
    <g transform="translate(6, 10.5) scale(0.409)">
      <path fill="#4285F4" d="M6 66h14V32L0 17v43c0 3.32 2.69 6 6 6" />
      <path fill="#34A853" d="M68 66h14c3.32 0 6-2.69 6-6V17L68 32" />
      <path fill="#FBBC04" d="M68 6v26L88 17V9c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#EA4335" d="M20 32V6l24 18L68 6v26L44 50" />
      <path fill="#C5221F" d="M0 9v8l20 15V6L14.4 1.8C8.46-2.65 0 1.58 0 9" />
    </g>
  </svg>
);

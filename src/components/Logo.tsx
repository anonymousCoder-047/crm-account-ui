import { motion } from 'framer-motion'

interface LogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizes = {
  xs: { width: 44, height: 44 },
  sm: { width: 127, height: 55 },
  md: { width: 171, height: 74 },
  lg: { width: 213, height: 92 },
}

function GradientDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-brand`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="45%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#d4af37" />
      </linearGradient>
      <linearGradient id={`${id}-text`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="55%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#d4af37" />
      </linearGradient>
      <linearGradient id={`${id}-sheen`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

function Monogram({ id, x = 0, y = 0, s = 1 }: { id: string; x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ transformOrigin: '56px 56px' }}
    >
      {/* Gradient tile */}
      <rect x="0" y="0" width="112" height="112" rx="26" fill={`url(#${id}-brand)`} />
      {/* Top sheen */}
      <rect x="0" y="0" width="112" height="56" rx="26" fill={`url(#${id}-sheen)`} />
      {/* Inner ring */}
      <rect
        x="4"
        y="4"
        width="104"
        height="104"
        rx="22"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      {/* "H" monogram — two ledger pillars joined by a balance beam
          (debit & credit, double-entry bookkeeping) */}
      <g fill="#0b1220">
        <rect x="30" y="28" width="16" height="56" rx="4" />
        <rect x="66" y="28" width="16" height="56" rx="4" />
        <rect x="30" y="49" width="52" height="14" rx="4" />
      </g>
      {/* Gold balance point at the center of the beam */}
      <motion.rect
        x="51"
        y="51"
        width="10"
        height="10"
        rx="2"
        fill="#f5d67b"
        transform="rotate(45 56 56)"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>
    </g>
  )
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const id = `logo-${size}`

  if (size === 'xs') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg
          width={sizes.xs.width}
          height={sizes.xs.height}
          viewBox="0 0 112 112"
          xmlns="http://www.w3.org/2000/svg"
        >
          <GradientDefs id={id} />
          <Monogram id={id} />
        </svg>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={sizes[size].width}
        height={sizes[size].height}
        viewBox="0 0 463 200"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto"
      >
        <GradientDefs id={id} />

        {/* Monogram tile — enlarged to match the full text-block height */}
        <Monogram id={id} x={10} y={33} s={1.2} />

        {/* Arabic wordmark — centered above the English wordmark */}
        <motion.text
          x="233"
          y="65"
          fontFamily="Noto Sans Arabic, Arial, sans-serif"
          fontSize="30"
          fontWeight="700"
          textAnchor="middle"
          fill="#d4af37"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          حساب
        </motion.text>

        {/* English wordmark — gradient text */}
        <motion.text
          x="160"
          y="130"
          fontFamily="Inter, Segoe UI, Arial, sans-serif"
          fontSize="64"
          fontWeight="800"
          letterSpacing="1"
          fill={`url(#${id}-text)`}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
        >
          Hisab
        </motion.text>

        {/* Caption */}
        <motion.text
          x="161"
          y="162"
          fontFamily="Inter, Segoe UI, Arial, sans-serif"
          fontSize="16"
          fontWeight="600"
          letterSpacing="6"
          fill="#8b98ad"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          ACCOUNTS &amp; FINANCE
        </motion.text>
      </svg>
    </div>
  )
}

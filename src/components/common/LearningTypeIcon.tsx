import { LEARNING_TYPES, type LearningType } from '@/lib/learning-types'

interface LearningTypeIconProps {
  type: LearningType
  size?: number
  className?: string
}

export function LearningTypeIcon({ type, size = 28, className }: LearningTypeIconProps) {
  const { icon, color } = LEARNING_TYPES[type]

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${icon})`,
        maskImage: `url(${icon})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}

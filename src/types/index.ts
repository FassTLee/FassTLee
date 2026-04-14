export interface Session {
  id: string
  memberId: string
  memberName: string
  category: string
  scheduledAt: string
  status: 'scheduled' | 'in_progress' | 'completed'
  hasUnwrittenReport?: boolean
  hasMemberMemo?: boolean
  hasAIRecommendation?: boolean
  hasFeedback?: boolean
  summary?: string
}

export interface Exercise {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  sets: ExerciseSet[]
  aiNote?: string
}

export interface ExerciseSet {
  setNumber: number
  weightKg: number
  reps: number
  note?: string
  exerciseSeconds?: number
  restSeconds?: number
  startedAt?: string
  endedAt?: string
}

export interface ConditioningItem {
  id: string
  type: 'massage' | 'stretch'
  name: string
  duration: number
  completed: boolean
}

export interface Notification {
  id: string
  type: 'report' | 'memo' | 'feedback' | 'ai'
  message: string
  memberName?: string
  sessionId?: string
  createdAt: string
}

export interface EducationProgress {
  chapter: string
  section: string
  isSkipped: boolean
  completedAt?: string
}

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

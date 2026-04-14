import { create } from 'zustand'
import { Session, Exercise, ConditioningItem } from '@/types'

interface SessionState {
  currentSession: Session | null
  exercises: Exercise[]
  conditioning: ConditioningItem[]
  activeTimers: Record<string, { running: boolean; seconds: number }>
  setCurrentSession: (session: Session | null) => void
  setExercises: (exercises: Exercise[]) => void
  addExercise: (exercise: Exercise) => void
  updateSet: (exerciseId: string, setIndex: number, data: Partial<Exercise['sets'][0]>) => void
  toggleTimer: (key: string) => void
  tickTimer: (key: string) => void
  resetTimer: (key: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  exercises: [],
  conditioning: [],
  activeTimers: {},
  setCurrentSession: (session) => set({ currentSession: session }),
  setExercises: (exercises) => set({ exercises }),
  addExercise: (exercise) =>
    set((state) => ({ exercises: [...state.exercises, exercise] })),
  updateSet: (exerciseId, setIndex, data) =>
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex ? { ...s, ...data } : s
              ),
            }
          : ex
      ),
    })),
  toggleTimer: (key) =>
    set((state) => ({
      activeTimers: {
        ...state.activeTimers,
        [key]: {
          running: !state.activeTimers[key]?.running,
          seconds: state.activeTimers[key]?.seconds ?? 0,
        },
      },
    })),
  tickTimer: (key) =>
    set((state) => ({
      activeTimers: {
        ...state.activeTimers,
        [key]: {
          ...state.activeTimers[key],
          seconds: (state.activeTimers[key]?.seconds ?? 0) + 1,
        },
      },
    })),
  resetTimer: (key) =>
    set((state) => ({
      activeTimers: {
        ...state.activeTimers,
        [key]: { running: false, seconds: 0 },
      },
    })),
}))

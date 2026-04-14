import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COURSES, XP_REWARDS, getXPForNextLevel } from '@/types/education'

export interface UserProgress {
  completedCourses: string[]      // course id list
  completedLessons: string[]      // lesson id list
  passedTests: string[]           // test id list (courseId + '-test')
  unlockedCourses: string[]       // currently unlocked course ids
}

export interface Gamification {
  xp: number
  level: number
  streakDays: number
  lastStudyDate: string | null    // ISO date string
  badges: string[]                // badge_type list
  weeklyXP: number
  monthlyXP: number
}

interface EducationState {
  progress: UserProgress
  gamification: Gamification
  // Actions
  completeLesson: (lessonId: string, courseId: string, lessonType: 'daily_snap' | 'full_lesson') => void
  passTest: (testId: string, isPerfect: boolean) => void
  completeCourse: (courseId: string) => void
  checkAndUnlockCourses: () => void
  checkStreak: () => void
  addBadge: (badgeType: string) => void
}

const INITIAL_PROGRESS: UserProgress = {
  completedCourses: [],
  completedLessons: [],
  passedTests: [],
  unlockedCourses: COURSES.filter((c) => !c.isLocked).map((c) => c.id),
}

const INITIAL_GAMIFICATION: Gamification = {
  xp: 0,
  level: 1,
  streakDays: 0,
  lastStudyDate: null,
  badges: [],
  weeklyXP: 0,
  monthlyXP: 0,
}

function calcLevel(xp: number): number {
  let level = 1
  let threshold = 0
  while (xp >= threshold + getXPForNextLevel(level)) {
    threshold += getXPForNextLevel(level)
    level++
    if (level > 20) break
  }
  return level
}

export const useEducationStore = create<EducationState>()(
  persist(
    (set, get) => ({
      progress: INITIAL_PROGRESS,
      gamification: INITIAL_GAMIFICATION,

      completeLesson: (lessonId, courseId, lessonType) => {
        const xpGain = lessonType === 'daily_snap' ? XP_REWARDS.DAILY_SNAP : XP_REWARDS.LESSON_COMPLETE
        set((state) => {
          const alreadyDone = state.progress.completedLessons.includes(lessonId)
          if (alreadyDone) return state
          const newXP = state.gamification.xp + xpGain
          const newLevel = calcLevel(newXP)
          return {
            progress: {
              ...state.progress,
              completedLessons: [...state.progress.completedLessons, lessonId],
            },
            gamification: {
              ...state.gamification,
              xp: newXP,
              level: newLevel,
              weeklyXP: state.gamification.weeklyXP + xpGain,
              monthlyXP: state.gamification.monthlyXP + xpGain,
            },
          }
        })
        get().checkStreak()
        get().addBadge('first_lesson')
      },

      passTest: (testId, isPerfect) => {
        const xpGain = isPerfect ? XP_REWARDS.TEST_PERFECT : XP_REWARDS.TEST_PASS
        set((state) => {
          if (state.progress.passedTests.includes(testId)) return state
          const newXP = state.gamification.xp + xpGain
          const newLevel = calcLevel(newXP)
          const newBadges = [...state.gamification.badges]
          if (isPerfect && !newBadges.includes('perfect_test')) newBadges.push('perfect_test')
          return {
            progress: {
              ...state.progress,
              passedTests: [...state.progress.passedTests, testId],
            },
            gamification: {
              ...state.gamification,
              xp: newXP,
              level: newLevel,
              weeklyXP: state.gamification.weeklyXP + xpGain,
              monthlyXP: state.gamification.monthlyXP + xpGain,
              badges: newBadges,
            },
          }
        })
        get().checkAndUnlockCourses()
      },

      completeCourse: (courseId) => {
        set((state) => {
          if (state.progress.completedCourses.includes(courseId)) return state
          const course = COURSES.find((c) => c.id === courseId)
          const xpGain = course?.xpReward ?? 10
          const newXP = state.gamification.xp + xpGain
          const newLevel = calcLevel(newXP)
          const newBadges = [...state.gamification.badges]
          if (!newBadges.includes('chapter_complete')) newBadges.push('chapter_complete')
          return {
            progress: {
              ...state.progress,
              completedCourses: [...state.progress.completedCourses, courseId],
            },
            gamification: {
              ...state.gamification,
              xp: newXP,
              level: newLevel,
              badges: newBadges,
              weeklyXP: state.gamification.weeklyXP + xpGain,
              monthlyXP: state.gamification.monthlyXP + xpGain,
            },
          }
        })
        get().checkAndUnlockCourses()
      },

      checkAndUnlockCourses: () => {
        set((state) => {
          const { completedCourses, passedTests } = state.progress
          const newUnlocked = [...state.progress.unlockedCourses]
          COURSES.forEach((course) => {
            if (newUnlocked.includes(course.id)) return
            if (!course.unlockCondition) { newUnlocked.push(course.id); return }
            const cond = course.unlockCondition
            if (cond.endsWith('-test-pass') && passedTests.includes(cond.replace('-test-pass', '-test'))) {
              newUnlocked.push(course.id)
            } else if (cond.endsWith('-complete') && completedCourses.includes(cond.replace('-complete', ''))) {
              newUnlocked.push(course.id)
            }
          })
          return { progress: { ...state.progress, unlockedCourses: newUnlocked } }
        })
      },

      checkStreak: () => {
        set((state) => {
          const today = new Date().toISOString().slice(0, 10)
          const last = state.gamification.lastStudyDate
          if (last === today) return state

          let streak = state.gamification.streakDays
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          if (last === yesterday) {
            streak += 1
          } else if (!last) {
            streak = 1
          } else {
            streak = 1  // broken streak
          }

          const newBadges = [...state.gamification.badges]
          let bonusXP = 0
          if (streak === 7 && !newBadges.includes('streak_7')) {
            newBadges.push('streak_7')
            bonusXP += XP_REWARDS.STREAK_7
          }
          if (streak === 30 && !newBadges.includes('streak_30')) {
            newBadges.push('streak_30')
            bonusXP += XP_REWARDS.STREAK_30
          }

          const newXP = state.gamification.xp + bonusXP
          return {
            gamification: {
              ...state.gamification,
              xp: newXP,
              level: calcLevel(newXP),
              streakDays: streak,
              lastStudyDate: today,
              badges: newBadges,
            },
          }
        })
      },

      addBadge: (badgeType) => {
        set((state) => {
          if (state.gamification.badges.includes(badgeType)) return state
          return {
            gamification: {
              ...state.gamification,
              badges: [...state.gamification.badges, badgeType],
            },
          }
        })
      },
    }),
    {
      name: 'fitdoor-education',
    }
  )
)

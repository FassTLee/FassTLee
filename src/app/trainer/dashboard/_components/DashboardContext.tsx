'use client'

import { createContext, useContext } from 'react'
import type {
  Tab,
  ChapterStat,
  VideoBookmark,
  SubjectCard,
  ActivityItem,
  TodayChapter,
  UserCertification,
  OralExamRegistration,
  CodeResultData,
} from './constants'

type Dispatch<T> = React.Dispatch<React.SetStateAction<T>>

export interface DashboardContextType {
  /* ── next-auth / next navigation ─────────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any

  /* ── Tab / 로그인 유도 ───────────────────────────────────────────── */
  tab: Tab
  setTab: Dispatch<Tab>
  showLoginPrompt: boolean
  setShowLoginPrompt: Dispatch<boolean>
  loading: boolean
  setLoading: Dispatch<boolean>

  /* ── Common ──────────────────────────────────────────────────────── */
  certLabel: string
  setCertLabel: Dispatch<string>
  certKey: string
  setCertKey: Dispatch<string>
  subjects: string[]
  setSubjects: Dispatch<string[]>
  style: string | null
  setStyle: Dispatch<string | null>
  styleType: string | null
  setStyleType: Dispatch<string | null>
  setUserName: Dispatch<string>

  /* ── Profile Me ──────────────────────────────────────────────────── */
  profileName: string | null
  setProfileName: Dispatch<string | null>
  profileAvatar: string | null
  setProfileAvatar: Dispatch<string | null>
  avatarError: boolean
  setAvatarError: Dispatch<boolean>
  showLogoutModal: boolean
  setShowLogoutModal: Dispatch<boolean>
  profileCert: string | null
  setProfileCert: Dispatch<string | null>
  profileExamDate: string | null
  setProfileExamDate: Dispatch<string | null>
  streak: number
  setStreak: Dispatch<number>

  /* ── Home ────────────────────────────────────────────────────────── */
  studiedToday: boolean
  setStudiedToday: Dispatch<boolean>
  recentActivity: ActivityItem[]
  setRecentActivity: Dispatch<ActivityItem[]>
  heartedVideos: Record<string, boolean>
  setHeartedVideos: Dispatch<Record<string, boolean>>
  subjectCards: SubjectCard[]
  setSubjectCards: Dispatch<SubjectCard[]>
  recentStats: ChapterStat[]
  setRecentStats: Dispatch<ChapterStat[]>
  allStats: ChapterStat[]
  setAllStats: Dispatch<ChapterStat[]>
  chapterSubjectMap: Record<string, string>
  setChapterSubjectMap: Dispatch<Record<string, string>>
  playingIdx: number | null
  setPlayingIdx: Dispatch<number | null>
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>

  /* ── D-Day (profiles.exam_target_date 단일 소스) ────────────────────── */
  showDDayModal: boolean
  setShowDDayModal: Dispatch<boolean>
  ddayNewCert: string
  setDdayNewCert: Dispatch<string>
  ddayNewDate: string
  setDdayNewDate: Dispatch<string>
  savingDDay: boolean
  setSavingDDay: Dispatch<boolean>

  /* ── Today chapter ───────────────────────────────────────────────── */
  todayChapter: TodayChapter | null
  setTodayChapter: Dispatch<TodayChapter | null>
  todayChapterState: 'lesson' | 'test_start' | 'test_retry' | null
  setTodayChapterState: Dispatch<'lesson' | 'test_start' | 'test_retry' | null>

  /* ── Classroom ───────────────────────────────────────────────────── */
  bookmarks: VideoBookmark[]
  setBookmarks: Dispatch<VideoBookmark[]>
  classroomLoaded: boolean
  setClassroomLoaded: Dispatch<boolean>
  expandedCertId: string | null
  setExpandedCertId: Dispatch<string | null>
  certOpen: boolean
  setCertOpen: Dispatch<boolean>
  methodOpen: boolean
  setMethodOpen: Dispatch<boolean>
  activityOpen: boolean
  setActivityOpen: Dispatch<boolean>
  certOrder: string[]
  setCertOrder: Dispatch<string[]>
  subjectOrderByCert: Record<string, string[]>
  setSubjectOrderByCert: Dispatch<Record<string, string[]>>
  subjectProgress: Record<string, { total: number; completed: number }>
  setSubjectProgress: Dispatch<Record<string, { total: number; completed: number }>>
  userCerts: UserCertification[]
  setUserCerts: Dispatch<UserCertification[]>
  // cert_id(user_certifications의 slug 문자열) → certifications.id(uuid) 매핑.
  // chapter_stats.certification_id에 넣을 실제 uuid를 구하기 위함 — 매칭 안 되는
  // 레거시 slug는 undefined를 반환하며, 그 경우 certId 없이 기존 동작 그대로 유지됨
  certSlugToId: Record<string, string>

  /* ── 모의고사 ────────────────────────────────────────────────────── */
  selectedExamCert: string | null
  setSelectedExamCert: Dispatch<string | null>
  oralRegs: OralExamRegistration[]
  setOralRegs: Dispatch<OralExamRegistration[]>
  oralLoading: boolean
  setOralLoading: Dispatch<boolean>
  showOralDatePicker: boolean
  setShowOralDatePicker: Dispatch<boolean>
  oralPickerTarget: { weekNum: number; slot: number; weekDates: string[] } | null
  setOralPickerTarget: Dispatch<{ weekNum: number; slot: number; weekDates: string[] } | null>
  oralPickerDate: string | null
  setOralPickerDate: Dispatch<string | null>
  showOralTicket: OralExamRegistration | null
  setShowOralTicket: Dispatch<OralExamRegistration | null>
  showOralTimeError: boolean
  setShowOralTimeError: Dispatch<boolean>
  showOralNoReg: boolean
  setShowOralNoReg: Dispatch<boolean>
  oralSubmitting: boolean
  setOralSubmitting: Dispatch<boolean>
  healthCertSubjects: { id: string; name: string }[]
  setHealthCertSubjects: Dispatch<{ id: string; name: string }[]>

  /* ── 모의고사 모달 ───────────────────────────────────────────────── */
  examRound: number
  setExamRound: Dispatch<number>
  showSubjectConfirmModal: boolean
  setShowSubjectConfirmModal: Dispatch<boolean>
  showRegisteredModal: boolean
  setShowRegisteredModal: Dispatch<boolean>
  showExamInfoModal: boolean
  setShowExamInfoModal: Dispatch<boolean>
  showExamClosedModal: boolean
  setShowExamClosedModal: Dispatch<boolean>
  showExamNotYetModal: boolean
  setShowExamNotYetModal: Dispatch<boolean>

  /* ── 캘린더 월 이동 ─────────────────────────────────────────────── */
  calYear: number
  setCalYear: Dispatch<number>
  calMonth: number
  setCalMonth: Dispatch<number>
  calTouchStartX: React.MutableRefObject<number | null>
  surveyCompletedRef: React.MutableRefObject<boolean>
  registeredRounds: number[]
  setRegisteredRounds: Dispatch<number[]>

  /* ── Phone Modal ─────────────────────────────────────────────────── */
  showPhoneModal: boolean
  setShowPhoneModal: Dispatch<boolean>

  /* ── Access Code Popup ───────────────────────────────────────────── */
  showCodePopup: boolean
  setShowCodePopup: Dispatch<boolean>
  codeInput: string
  setCodeInput: Dispatch<string>
  codeError: string | null
  setCodeError: Dispatch<string | null>
  codeSubmitting: boolean
  setCodeSubmitting: Dispatch<boolean>
  _accessCodeUsed: string | null
  setAccessCodeUsed: Dispatch<string | null>
  _codeExpiresAt: string | null
  setCodeExpiresAt: Dispatch<string | null>
  codeResult: CodeResultData | null
  setCodeResult: Dispatch<CodeResultData | null>

  /* ── 학습 유형 검사 팝업 ─────────────────────────────────────────── */
  profileLearningStyle: string | null | undefined
  setProfileLearningStyle: Dispatch<string | null | undefined>

  /* ── certification_subjects DB 데이터 ───────────────────────────── */
  dbRequiredNames: string[]
  setDbRequiredNames: Dispatch<string[]>
  dbGoalSubjects: { name: string; is_required: boolean }[]
  setDbGoalSubjects: Dispatch<{ name: string; is_required: boolean }[]>

  /* ── Profile ─────────────────────────────────────────────────────── */
  examDateInput: string
  setExamDateInput: Dispatch<string>
  certTypeInput: string
  setCertTypeInput: Dispatch<string>
  regionInput: string
  setRegionInput: Dispatch<string>
  dailyHoursInput: string
  setDailyHoursInput: Dispatch<string>
  studyTimeInput: string
  setStudyTimeInput: Dispatch<string>
  studyCountInput: string
  setStudyCountInput: Dispatch<string>
  studyTimeSlotInput: string
  setStudyTimeSlotInput: Dispatch<string>
  _pushEnabled: boolean
  _setPushEnabled: Dispatch<boolean>
  savingProfile: boolean
  setSavingProfile: Dispatch<boolean>

  /* ── 이용 설문 팝업 ──────────────────────────────────────────────── */
  subjectStarStats: Record<string, { fire: number; star: number }>
  setSubjectStarStats: Dispatch<Record<string, { fire: number; star: number }>>
  showSurveyPopup: boolean
  setShowSurveyPopup: Dispatch<boolean>
  hasShownSurveyThisSession: boolean
  setHasShownSurveyThisSession: Dispatch<boolean>
  surveyStep: number
  setSurveyStep: Dispatch<number>
  surveyQ1: string
  setSurveyQ1: Dispatch<string>
  surveyQ2: string
  setSurveyQ2: Dispatch<string>
  surveyQ1Temp: string
  setSurveyQ1Temp: Dispatch<string>
  surveyQ2Temp: string
  setSurveyQ2Temp: Dispatch<string>
  surveyStars: number
  setSurveyStars: Dispatch<number>
  surveyText: string
  setSurveyText: Dispatch<string>
  surveyFeedback: string
  setSurveyFeedback: Dispatch<string>
  surveyConsent: boolean
  setSurveyConsent: Dispatch<boolean>
  surveyLoading: boolean
  setSurveyLoading: Dispatch<boolean>
  surveyDone: boolean
  setSurveyDone: Dispatch<boolean>
  showToast: boolean
  setShowToast: Dispatch<boolean>
  toastMessage: string
  setToastMessage: Dispatch<string>

  /* ── Handlers ────────────────────────────────────────────────────── */
  initCommon: () => Promise<void>
  loadClassroom: () => Promise<void>
  _handleHeartVideo: (title: string) => Promise<void>
  handleVideoTap: (idx: number) => Promise<void>
  dismissCodePopup: () => Promise<void>
  handleCodeSubmit: () => Promise<void>
  handleAddDDayGoal: () => Promise<void>
  handleClearDDay: () => Promise<void>
  moveCert: (idx: number, dir: 'up' | 'down') => void
  moveSubject: (certId: string, idx: number, dir: 'up' | 'down') => void
  handleOrderSave: () => Promise<void>
  handleSurveySubmit: () => Promise<void>
  handleSaveProfile: () => Promise<void>
  _handleTogglePush: (value: boolean) => Promise<void>
  moveCalMonth: (delta: number) => void
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({ value, children }: {
  value: DashboardContextType
  children: React.ReactNode
}) {
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}

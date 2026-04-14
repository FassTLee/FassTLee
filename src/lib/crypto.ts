// ================================================================
// AES-256-GCM 암호화 유틸리티 (서버사이드 전용)
// ================================================================
// ⚠️  절대 클라이언트 컴포넌트에서 import 금지
// ⚠️  ENCRYPTION_KEY는 서버 환경변수에만 보관

/**
 * 32바이트 랜덤 키 생성 (최초 1회 실행 후 .env에 저장)
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16   // bytes

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length < 64) {
    // 개발 환경: 임시 키 (운영에서는 반드시 환경변수 설정)
    if (process.env.NODE_ENV === 'development') {
      return Buffer.alloc(32, 'fitdoor-dev-key-placeholder-32b!')
    }
    throw new Error('ENCRYPTION_KEY environment variable is not set or too short')
  }
  return Buffer.from(keyHex.slice(0, 64), 'hex')
}

/**
 * 개인 식별 데이터 암호화 (AES-256-GCM)
 * @param plaintext 암호화할 평문
 * @returns base64 인코딩된 암호문 (iv:tag:ciphertext 형식)
 */
export async function encrypt(plaintext: string): Promise<string> {
  // Node.js crypto (서버 전용)
  const { createCipheriv, randomBytes } = await import('crypto')
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // iv:tag:ciphertext를 base64로 인코딩하여 반환
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * 암호화된 데이터 복호화
 * @param ciphertext iv:tag:ciphertext 형식의 base64 문자열
 * @returns 복호화된 평문
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const { createDecipheriv } = await import('crypto')
  const key = getKey()
  const [ivB64, tagB64, dataB64] = ciphertext.split(':')

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid ciphertext format')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(data) + decipher.final('utf8')
}

/**
 * 개인정보 마스킹 (화면 표시용)
 * 이메일: abc***@domain.com
 * 이름: 홍*동
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const masked = local.slice(0, 3) + '***'
  return `${masked}@${domain}`
}

export function maskName(name: string): string {
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

/**
 * 해시 (검색/비교용 — 복호화 불필요한 경우)
 */
export async function hashValue(value: string): Promise<string> {
  const { createHash } = await import('crypto')
  return createHash('sha256')
    .update(value + (process.env.HASH_SALT ?? 'fitdoor-salt'))
    .digest('hex')
}

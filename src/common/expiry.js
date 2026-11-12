// Map the host expiry onto the band clock using the earliest possible offset.
// The host samples its send time after receiving the echoed client timestamp.
export function createLeaseClock() {
  let offset = null, last = 0
  function deadline(sentAt, expiresAt, remainingMs, maxAge, now) {
    if (offset === null || !Number.isSafeInteger(sentAt) || sentAt + offset > now ||
        !Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(remainingMs) ||
        remainingMs <= 0 || remainingMs > maxAge) return 0
    const limit = Math.min(now + remainingMs, expiresAt + offset) - 1000
    return limit >= now + 1000 ? limit : 0
  }
  return {
    reset(now) { offset = null; last = now },
    check(now) {
      if (now < last) { this.reset(now); return false }
      last = now
      return true
    },
    sync(sent, echo, now) {
      if (!Number.isSafeInteger(sent) || !Number.isSafeInteger(echo) || now < echo || now - echo > 35000) return false
      offset = echo - sent
      return true
    },
    deadline(frame, now) {
      return deadline(frame.sentAt, frame.expiresAt, frame.remainingMs, 60000, now)
    },
    balanceDeadline(frame, now) {
      return deadline(frame.sentAt, frame.balanceExpiresAt, frame.balanceRemainingMs, 120000, now)
    }
  }
}

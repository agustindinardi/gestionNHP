const AR_TIME_ZONE = "America/Argentina/Buenos_Aires"
const AR_LOCALE = "es-AR"

function getPart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value || ""
}

export function getArgentinaTodayYmd(date = new Date()) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const year = getPart(parts, "year")
  const month = getPart(parts, "month")
  const day = getPart(parts, "day")
  return `${year}-${month}-${day}`
}

export function addDaysToYmd(ymd: string, delta: number) {
  const [year, month, day] = ymd.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + delta)
  const newYear = date.getUTCFullYear().toString().padStart(4, "0")
  const newMonth = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const newDay = date.getUTCDate().toString().padStart(2, "0")
  return `${newYear}-${newMonth}-${newDay}`
}

function dateForYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatArgentinaDayLabel(ymd: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    weekday: "long",
    day: "numeric",
  })
  const label = formatter.format(dateForYmd(ymd))
  return capitalize(label)
}

export function formatArgentinaDayLabelShort(ymd: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    weekday: "short",
    day: "numeric",
  })
  const label = formatter.format(dateForYmd(ymd))
  return capitalize(label)
}

export function formatArgentinaDayLabelMobileCompact(ymd: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    weekday: "short",
  })
  const label = formatter.format(dateForYmd(ymd))
  return capitalize(label)
}

export function formatArgentinaMonthLabel(ymd: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    month: "long",
    year: "numeric",
  })
  return capitalize(formatter.format(dateForYmd(ymd)))
}

export function formatArgentinaFullDate(ymd: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return capitalize(formatter.format(dateForYmd(ymd)))
}

export function formatArgentinaDateTime(iso: string) {
  const formatter = new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: AR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const parts = formatter.formatToParts(new Date(iso))
  const day = getPart(parts, "day")
  const month = getPart(parts, "month")
  const year = getPart(parts, "year")
  const hour = getPart(parts, "hour")
  const minute = getPart(parts, "minute")
  return `${day}/${month}/${year} ${hour}:${minute}`
}

export function formatArgentinaTimeValue(value?: string | null) {
  if (!value) return "-"
  return value.slice(0, 5)
}

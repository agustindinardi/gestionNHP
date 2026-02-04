/**
 * Formatea una fecha al formato DD/MM/YYYY
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea una fecha al formato DD/MM/YYYY HH:mm
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formatea un número grande con separador de miles
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("es-AR")
}

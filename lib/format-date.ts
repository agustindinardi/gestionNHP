/**
 * Formatea una fecha al formato DD/MM/YYYY
 * Si recibe un string en formato YYYY-MM-DD, lo parsea manualmente para evitar problemas de timezone
 */
export function formatDate(date: string | Date): string {
  // Si es un string en formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de timezone
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-")
    return `${day}/${month}/${year}`
  }
  
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

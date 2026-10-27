// Parse useful_life string to get numeric value (assumes it's in copies)
export function parseUsefulLife(usefulLife: string): number | null {
  // Remove dots/commas as thousand separators and extract number
  const cleaned = usefulLife.replace(/\./g, "").replace(/,/g, "")
  const match = cleaned.match(/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

export function calculateLifePercentage(
  currentCounter: number,
  counterAtChange: number,
  usefulLife: string
): { percentage: number; copiesUsed: number; totalLife: number | null } {
  const totalLife = parseUsefulLife(usefulLife)
  const copiesUsed = currentCounter - counterAtChange

  if (totalLife === null || totalLife === 0) {
    return { percentage: 0, copiesUsed, totalLife: null }
  }

  const remaining = totalLife - copiesUsed
  const percentage = Math.max(0, Math.min(100, (remaining / totalLife) * 100))

  return { percentage, copiesUsed, totalLife }
}

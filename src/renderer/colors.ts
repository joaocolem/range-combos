// Cores por acao, usadas no grid individual, no grid mesclado e na legenda.

type Rgb = [number, number, number]

const MAP: Record<string, Rgb> = {
  raise: [216, 78, 58],
  call: [56, 120, 198],
  fold: [110, 120, 135],
  '3bet': [205, 120, 40],
  '4bet': [180, 70, 40],
  allin: [150, 60, 160],
  'all-in': [150, 60, 160],
  limp: [70, 160, 110],
  check: [70, 160, 110]
}

const FALLBACK: Rgb[] = [
  [70, 160, 110],
  [205, 120, 40],
  [150, 60, 160],
  [120, 140, 60],
  [60, 150, 170]
]

export function actionRgb(action: string, index = 0): Rgb {
  const a = action.toLowerCase().replace(/\s+/g, '')
  return MAP[a] ?? FALLBACK[index % FALLBACK.length]
}

export function rgbCss(c: Rgb, alpha = 1): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/**
 * Natural order for class labels: 5,6,7,8,9,10 — not 10,5,6… (string sort).
 * Matches backend `_natural_class_sort_key`.
 */
export function sortClassNames(list) {
  if (!list?.length) return []
  const key = (v) => {
    const s = String(v).trim()
    const m = /^(\d+)(.*)$/.exec(s)
    if (m) return [0, parseInt(m[1], 10), m[2].toLowerCase()]
    return [1, s.toLowerCase()]
  }
  return [...list].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    const len = Math.max(ka.length, kb.length)
    for (let i = 0; i < len; i++) {
      const va = ka[i]
      const vb = kb[i]
      if (va === vb) continue
      if (typeof va === 'number' && typeof vb === 'number') return va - vb
      return String(va).localeCompare(String(vb))
    }
    return 0
  })
}

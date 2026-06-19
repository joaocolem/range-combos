// Repositorio do GitHub usado para releases/updates.
// IMPORTANTE: mantenha igual ao owner/repo em electron-builder.yml.
export const GITHUB_OWNER = 'joaocolem'
export const GITHUB_REPO = 'range-combos'

export function releasesUrl(): string {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
}

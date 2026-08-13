import { describe, expect, it } from 'vitest'
import { isIgnored } from '../src/analysis/walk.js'

const REPO = '/repo'
const at = (rel: string): string => `${REPO}/${rel}`

describe('isIgnored', () => {
  it('does not ignore the repo root itself', () => {
    expect(isIgnored(REPO, REPO)).toBe(false)
  })

  it('ignores known directory names', () => {
    expect(isIgnored(at('node_modules/lodash/index.js'), REPO)).toBe(true)
    expect(isIgnored(at('target/debug/foo'), REPO)).toBe(true)
    expect(isIgnored(at('.git/HEAD'), REPO)).toBe(true)
    expect(isIgnored(at('dist/index.js'), REPO)).toBe(true)
  })

  it('ignores paths that traverse into a hidden dir mid-path', () => {
    expect(isIgnored(at('src/.hidden/foo.ts'), REPO)).toBe(true)
  })

  it('does not ignore ordinary source paths', () => {
    expect(isIgnored(at('src/server.ts'), REPO)).toBe(false)
    expect(isIgnored(at('backend/src/routes/scan.ts'), REPO)).toBe(false)
    expect(isIgnored(at('foo/bar/baz.rs'), REPO)).toBe(false)
  })
})

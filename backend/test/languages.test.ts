import { describe, expect, it } from 'vitest'
import { getLanguageColor, getLanguageFromExtension } from '../src/analysis/languages.js'

describe('getLanguageFromExtension', () => {
  it('maps known extensions', () => {
    expect(getLanguageFromExtension('ts')).toBe('TypeScript')
    expect(getLanguageFromExtension('tsx')).toBe('TypeScript')
    expect(getLanguageFromExtension('rs')).toBe('Rust')
    expect(getLanguageFromExtension('cpp')).toBe('C++')
  })

  it('is case-insensitive', () => {
    expect(getLanguageFromExtension('TS')).toBe('TypeScript')
    expect(getLanguageFromExtension('Rs')).toBe('Rust')
  })

  it('returns undefined for unknown extensions', () => {
    expect(getLanguageFromExtension('xyz')).toBeUndefined()
    expect(getLanguageFromExtension('')).toBeUndefined()
  })
})

describe('getLanguageColor', () => {
  it('returns known colors', () => {
    expect(getLanguageColor('Rust')).toBe('#DEA584')
    expect(getLanguageColor('TypeScript')).toBe('#3178C6')
  })

  it('falls back to the default grey', () => {
    expect(getLanguageColor('Whitespace')).toBe('#8B8B8B')
  })

  it('is case-insensitive', () => {
    expect(getLanguageColor('rust')).toBe('#DEA584')
    expect(getLanguageColor('RUST')).toBe('#DEA584')
  })
})

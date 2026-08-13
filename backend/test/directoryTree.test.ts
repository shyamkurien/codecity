import { describe, expect, it } from 'vitest'
import {
  ancestorDirs,
  buildDirectoryTree,
  calculateLanguageBreakdown,
  fileParentDir,
} from '../src/analysis/directoryTree.js'

describe('ancestorDirs', () => {
  it('returns root plus every intermediate dir', () => {
    expect(ancestorDirs('a/b/c.ts')).toEqual(['', 'a', 'a/b'])
  })

  it('returns just root for a top-level file', () => {
    expect(ancestorDirs('README.md')).toEqual([''])
  })
})

describe('fileParentDir', () => {
  it('returns empty for top-level files', () => {
    expect(fileParentDir('README.md')).toBe('')
  })

  it('returns dirname for nested files', () => {
    expect(fileParentDir('src/routes/scan.ts')).toBe('src/routes')
  })
})

describe('calculateLanguageBreakdown', () => {
  it('sums percentages to 100 for a single language', () => {
    const [entry] = calculateLanguageBreakdown(new Map([['Rust', 50]]), 50)
    expect(entry?.percentage).toBeCloseTo(100)
    expect(entry?.color).toBe('#DEA584')
  })

  it('sorts by lines desc', () => {
    const out = calculateLanguageBreakdown(
      new Map([
        ['Rust', 10],
        ['TypeScript', 40],
        ['Markdown', 25],
      ]),
      75,
    )
    expect(out.map((l) => l.language)).toEqual(['TypeScript', 'Markdown', 'Rust'])
  })

  it('returns an empty array when total is 0', () => {
    expect(calculateLanguageBreakdown(new Map(), 0)).toEqual([])
  })
})

describe('buildDirectoryTree', () => {
  it('nests children under parents and sorts by lines desc', () => {
    const dirStats = new Map([
      ['', { lines: 5, languages: new Map([['Markdown', 5]]) }],
      ['src', { lines: 100, languages: new Map([['TypeScript', 100]]) }],
      ['src/routes', { lines: 60, languages: new Map([['TypeScript', 60]]) }],
      ['src/analysis', { lines: 200, languages: new Map([['TypeScript', 200]]) }],
    ])
    const ages = new Map([
      ['', 30],
      ['src', 20],
      ['src/routes', 10],
      ['src/analysis', 15],
    ])

    const tree = buildDirectoryTree(dirStats, ages)
    // roots: (root) and src (both top-level). src has higher lines → first.
    expect(tree.map((n) => n.name)).toEqual(['src', '(root)'])

    const src = tree[0]!
    expect(src.age_days).toBe(20)
    expect(src.children.map((c) => c.name)).toEqual(['analysis', 'routes'])
    expect(src.children[0]?.lines).toBe(200)
    expect(src.children[1]?.lines).toBe(60)
  })
})

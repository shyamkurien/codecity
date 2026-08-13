import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { countLines } from '../src/analysis/lineCount.js'

let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'linecount-'))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function write(name: string, data: string | Buffer): Promise<string> {
  const path = join(dir, name)
  await writeFile(path, data)
  return path
}

describe('countLines (matches Rust str::lines().count())', () => {
  it('returns 0 for an empty file', async () => {
    expect(await countLines(await write('empty', ''))).toBe(0)
  })

  it('counts a single line with no trailing newline as 1', async () => {
    expect(await countLines(await write('one', 'hello'))).toBe(1)
  })

  it('counts two newlines as two lines when file ends with newline', async () => {
    expect(await countLines(await write('two-nl', 'a\nb\n'))).toBe(2)
  })

  it('counts trailing partial line', async () => {
    expect(await countLines(await write('two-part', 'a\nb'))).toBe(2)
  })

  it('handles non-UTF-8 bytes (which the Rust impl silently dropped)', async () => {
    const buf = Buffer.from([0xff, 0xfe, 0x0a, 0x80, 0x0a, 0x00])
    expect(await countLines(await write('binary', buf))).toBe(3)
  })
})

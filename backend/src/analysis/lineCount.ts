import { createReadStream } from 'node:fs'

const NEWLINE = 0x0a

// Mirrors Rust `str::lines().count()`: a trailing partial line without a
// terminating newline still counts. Empty files return 0.
export async function countLines(filepath: string): Promise<number> {
  let count = 0
  let hasContent = false
  let lastByte = 0

  const stream = createReadStream(filepath)
  try {
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      if (chunk.length === 0) continue
      hasContent = true
      for (let i = 0; i < chunk.length; i++) {
        const b = chunk[i]!
        if (b === NEWLINE) count++
        lastByte = b
      }
    }
  } catch {
    return 0
  }

  if (hasContent && lastByte !== NEWLINE) count++
  return count
}

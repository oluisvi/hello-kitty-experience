import test from 'node:test'
import assert from 'node:assert/strict'
import { memories } from '../src/data/memories.js'

test('every provided portrait is represented exactly once', () => {
  assert.equal(memories.length, 8)
  assert.equal(new Set(memories.map((memory) => memory.src)).size, 8)
})

test('every photo has meaningful alt text and a short caption', () => {
  for (const memory of memories) {
    assert.ok(memory.alt.length > 20)
    assert.ok(memory.caption.length > 1)
  }
})

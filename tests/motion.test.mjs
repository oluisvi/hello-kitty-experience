import test from 'node:test'
import assert from 'node:assert/strict'
import { motionProfile } from '../src/hooks/motion-profile.js'

test('reduced motion disables ambient and pointer effects', () => {
  assert.deepEqual(motionProfile({ reduced: true, compact: false }), {
    particles: 0,
    parallax: false,
    pointerTrail: false,
    autoFloat: false,
  })
})

test('compact devices use a lighter profile', () => {
  assert.deepEqual(motionProfile({ reduced: false, compact: true }), {
    particles: 10,
    parallax: false,
    pointerTrail: false,
    autoFloat: true,
  })
})

test('desktop receives the full profile', () => {
  assert.deepEqual(motionProfile({ reduced: false, compact: false }), {
    particles: 24,
    parallax: true,
    pointerTrail: true,
    autoFloat: true,
  })
})

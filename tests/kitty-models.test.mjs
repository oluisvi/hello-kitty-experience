import test from 'node:test'
import assert from 'node:assert/strict'

import { kittyModels } from '../src/data/kitty-models.js'

test('exposes three distinct local Hello Kitty models with front-facing rotations', () => {
  assert.equal(kittyModels.length, 3)
  assert.equal(new Set(kittyModels.map((model) => model.url)).size, 3)
  for (const model of kittyModels) {
    assert.match(model.url, /^\/assets\/models\/.*\.glb$/)
    assert.equal(typeof model.frontRotationY, 'number')
    assert.equal(typeof model.fitSize, 'number')
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8')

test('page exposes three interactive kitty canvases spread through the experience', () => {
  for (const id of ['hero-kitty-canvas', 'dream-kitty-canvas', 'final-kitty-canvas']) {
    assert.match(html, new RegExp(`id="${id}"`))
  }
})

test('responsive CSS has dedicated phone, tablet and wide-screen tuning', () => {
  assert.match(css, /@media \(max-width: 520px\)/)
  assert.match(css, /@media \(max-width: 820px\)/)
  assert.match(css, /@media \(min-width: 1600px\)/)
})

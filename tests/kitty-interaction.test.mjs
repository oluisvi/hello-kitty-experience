import test from 'node:test'
import assert from 'node:assert/strict'

if (!globalThis.window) {
  globalThis.window = { matchMedia: () => ({ matches: false }) }
}

const { Kitty3D } = await import('../src/three/kitty3d.js')

test('drag interaction changes yaw and pitch and clamps vertical rotation', () => {
  const kitty = new Kitty3D({}, { dragSensitivity: 0.01 })
  kitty.beginDrag(100, 100)
  kitty.dragTo(150, -500)

  assert.ok(kitty.targetUserRotation.yaw > 0.4)
  assert.ok(kitty.targetUserRotation.pitch <= 1.05)
  assert.equal(kitty.dragging, true)

  kitty.endDrag()
  assert.equal(kitty.dragging, false)
})

test('auto rotation advances only while idle', () => {
  const kitty = new Kitty3D({}, { autoRotateSpeed: 0.001 })
  kitty.advanceAutoRotation(1000)
  assert.ok(kitty.autoRotationY > 0)

  const before = kitty.autoRotationY
  kitty.beginDrag(0, 0)
  kitty.advanceAutoRotation(1000)
  assert.equal(kitty.autoRotationY, before)
})

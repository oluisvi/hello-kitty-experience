function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

export function createAmbientSparkles(root, count) {
  if (!root || count <= 0) return () => {}

  const fragment = document.createDocumentFragment()
  const nodes = []
  const glyphs = ['✦', '♡', '✧', '·']

  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement('span')
    sparkle.className = 'ambient-sparkle'
    sparkle.textContent = glyphs[index % glyphs.length]
    sparkle.style.setProperty('--x', `${randomBetween(2, 98).toFixed(2)}%`)
    sparkle.style.setProperty('--y', `${randomBetween(2, 98).toFixed(2)}%`)
    sparkle.style.setProperty('--size', `${randomBetween(0.55, 1.25).toFixed(2)}rem`)
    sparkle.style.setProperty('--delay', `${randomBetween(-8, 0).toFixed(2)}s`)
    sparkle.style.setProperty('--duration', `${randomBetween(5.5, 10).toFixed(2)}s`)
    sparkle.setAttribute('aria-hidden', 'true')
    nodes.push(sparkle)
    fragment.append(sparkle)
  }

  root.append(fragment)
  return () => nodes.forEach((node) => node.remove())
}

export function heartBurst(x, y, count = 14, options = {}) {
  const { spread = 90, className = '' } = options
  const fragment = document.createDocumentFragment()

  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement('span')
    heart.className = `burst-heart ${className}`.trim()
    heart.textContent = index % 4 === 0 ? '✦' : '♥'
    const angle = (Math.PI * 2 * index) / count + randomBetween(-0.22, 0.22)
    const distance = randomBetween(spread * 0.45, spread)
    heart.style.left = `${x}px`
    heart.style.top = `${y}px`
    heart.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
    heart.style.setProperty('--dy', `${Math.sin(angle) * distance}px`)
    heart.style.setProperty('--spin', `${randomBetween(-90, 90).toFixed(0)}deg`)
    heart.style.setProperty('--scale', randomBetween(0.72, 1.35).toFixed(2))
    fragment.append(heart)
    heart.addEventListener('animationend', () => heart.remove(), { once: true })
  }

  document.body.append(fragment)
}

export function installCursorTrail({ enabled }) {
  if (!enabled) return () => {}

  const cursor = document.createElement('div')
  cursor.className = 'heart-cursor'
  cursor.innerHTML = '<span>♥</span>'
  cursor.setAttribute('aria-hidden', 'true')
  document.body.append(cursor)
  document.documentElement.classList.add('has-heart-cursor')

  let targetX = window.innerWidth / 2
  let targetY = window.innerHeight / 2
  let x = targetX
  let y = targetY
  let frame = 0
  let lastTrailAt = 0

  const animate = () => {
    x += (targetX - x) * 0.22
    y += (targetY - y) * 0.22
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
    frame = requestAnimationFrame(animate)
  }

  const onMove = (event) => {
    targetX = event.clientX
    targetY = event.clientY
    const now = performance.now()
    if (now - lastTrailAt > 64) {
      lastTrailAt = now
      const dot = document.createElement('span')
      dot.className = 'cursor-trail-dot'
      dot.textContent = Math.random() > 0.72 ? '✦' : '♡'
      dot.style.left = `${event.clientX + randomBetween(-3, 3)}px`
      dot.style.top = `${event.clientY + randomBetween(-3, 3)}px`
      document.body.append(dot)
      dot.addEventListener('animationend', () => dot.remove(), { once: true })
    }
  }

  const onOver = (event) => {
    const interactive = event.target.closest('a, button, [role="button"], .polaroid, .draggable-sticker')
    cursor.classList.toggle('is-hovering', Boolean(interactive))
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerover', onOver, { passive: true })
  frame = requestAnimationFrame(animate)

  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerover', onOver)
    document.documentElement.classList.remove('has-heart-cursor')
    cursor.remove()
  }
}

export function observeReveals() {
  const nodes = [...document.querySelectorAll('[data-reveal]')]
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'))
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
  )

  nodes.forEach((node) => observer.observe(node))
  return () => observer.disconnect()
}

export function makeDraggable(element, { onMove, onRelease, maxDistance = 220 } = {}) {
  let pointerId = null
  let originX = 0
  let originY = 0
  let startX = 0
  let startY = 0
  let currentX = 0
  let currentY = 0
  let moved = false

  const down = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    const storedX = Number(element.dataset.dragX || 0)
    const storedY = Number(element.dataset.dragY || 0)
    originX = storedX
    originY = storedY
    currentX = storedX
    currentY = storedY
    moved = false
    element.setPointerCapture?.(pointerId)
    element.classList.add('is-dragging')
  }

  const move = (event) => {
    if (event.pointerId !== pointerId) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true
    currentX = Math.max(-maxDistance, Math.min(maxDistance, originX + dx))
    currentY = Math.max(-maxDistance, Math.min(maxDistance, originY + dy))
    element.dataset.dragX = currentX.toFixed(1)
    element.dataset.dragY = currentY.toFixed(1)
    element.style.setProperty('--drag-x', `${currentX}px`)
    element.style.setProperty('--drag-y', `${currentY}px`)
    onMove?.({ x: currentX, y: currentY, moved })
  }

  const up = (event) => {
    if (event.pointerId !== pointerId) return
    element.releasePointerCapture?.(pointerId)
    element.classList.remove('is-dragging')
    pointerId = null
    element.dataset.wasDragged = moved ? 'true' : 'false'
    onRelease?.({ x: currentX, y: currentY, moved })
    requestAnimationFrame(() => {
      element.dataset.wasDragged = 'false'
    })
  }

  element.addEventListener('pointerdown', down)
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerup', up)
  element.addEventListener('pointercancel', up)

  return () => {
    element.removeEventListener('pointerdown', down)
    element.removeEventListener('pointermove', move)
    element.removeEventListener('pointerup', up)
    element.removeEventListener('pointercancel', up)
  }
}

export function installDragScroll(scroller) {
  if (!scroller) return () => {}
  let pointerId = null
  let startX = 0
  let startScroll = 0
  let moved = false

  const down = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    pointerId = event.pointerId
    startX = event.clientX
    startScroll = scroller.scrollLeft
    moved = false
    scroller.dataset.wasDragged = 'false'
    scroller.setPointerCapture?.(pointerId)
    scroller.classList.add('is-dragging')
  }

  const move = (event) => {
    if (event.pointerId !== pointerId) return
    const delta = event.clientX - startX
    if (Math.abs(delta) > 7) moved = true
    scroller.scrollLeft = startScroll - delta
  }

  const up = (event) => {
    if (event.pointerId !== pointerId) return
    scroller.releasePointerCapture?.(pointerId)
    pointerId = null
    scroller.classList.remove('is-dragging')
    scroller.dataset.wasDragged = moved ? 'true' : 'false'
    requestAnimationFrame(() => { scroller.dataset.wasDragged = 'false' })
  }

  scroller.addEventListener('pointerdown', down)
  scroller.addEventListener('pointermove', move)
  scroller.addEventListener('pointerup', up)
  scroller.addEventListener('pointercancel', up)

  return () => {
    scroller.removeEventListener('pointerdown', down)
    scroller.removeEventListener('pointermove', move)
    scroller.removeEventListener('pointerup', up)
    scroller.removeEventListener('pointercancel', up)
  }
}

export function showToast(message, timeout = 2100) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('is-visible')
  window.clearTimeout(Number(toast.dataset.timer || 0))
  const timer = window.setTimeout(() => toast.classList.remove('is-visible'), timeout)
  toast.dataset.timer = String(timer)
}

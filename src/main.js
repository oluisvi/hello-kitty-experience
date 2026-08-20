import { memories } from './data/memories.js'
import { kittyModels } from './data/kitty-models.js'
import { motionProfile } from './hooks/motion-profile.js'
import { Kitty3D } from './three/kitty3d.js'
import {
  createAmbientSparkles,
  heartBurst,
  installCursorTrail,
  installDragScroll,
  makeDraggable,
  observeReveals,
  showToast,
} from './animations/effects.js'
import { createLightbox } from './components/lightbox.js'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const compact = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches
const profile = motionProfile({ reduced: reducedMotion, compact })
const cleanup = []

const body = document.body
const main = document.getElementById('main')
const intro = document.getElementById('intro')
const enterButton = document.getElementById('enter-button')
const ambientLayer = document.getElementById('ambient-layer')
const scrapbookCards = document.getElementById('scrapbook-cards')
const filmRail = document.getElementById('film-strip-rail')
const filmStrip = document.getElementById('film-strip')
const photoDialog = document.getElementById('photo-dialog')
const finalReveal = document.getElementById('final-reveal')
const finalRevealButton = document.getElementById('final-reveal-button')
const finalRevealClose = document.getElementById('final-reveal-close')
const progressHeart = document.getElementById('progress-heart')

main.inert = true

const lightbox = createLightbox(photoDialog)

function memoryCard(memory, index) {
  const button = document.createElement('button')
  button.className = 'polaroid'
  button.type = 'button'
  button.dataset.memory = String(index)
  button.style.setProperty('--rotation', `${memory.rotation}deg`)
  button.style.setProperty('--tape-rotation', `${index % 2 ? 4 : -5}deg`)
  button.style.setProperty(
    '--tape-color',
    index % 3 === 0 ? 'rgb(255 197 220 / 72%)' : index % 3 === 1 ? 'rgb(255 232 129 / 70%)' : 'rgb(211 196 255 / 72%)',
  )
  button.setAttribute('aria-label', `Open photo: ${memory.caption}`)
  button.innerHTML = `
    <span class="polaroid__image-wrap">
      <img src="${memory.src}" alt="${memory.alt}" loading="lazy" decoding="async" draggable="false" />
      <span class="polaroid__spark" aria-hidden="true">✦</span>
    </span>
    <span class="polaroid__caption">${memory.caption}</span>
  `

  const disposeDrag = makeDraggable(button, {
    maxDistance: compact ? 74 : 180,
  })
  cleanup.push(disposeDrag)

  button.addEventListener('click', () => {
    if (button.dataset.wasDragged === 'true') return
    lightbox.open(memory)
  })

  return button
}

memories.slice(0, 6).forEach((memory, index) => {
  scrapbookCards.append(memoryCard(memory, index))
})

const filmMemories = [memories[2], memories[6], memories[7], memories[3], memories[4]]
filmMemories.forEach((memory, index) => {
  const button = document.createElement('button')
  button.className = 'film-frame'
  button.type = 'button'
  button.style.setProperty('--film-rotation', `${[-2.2, 1.4, -1.1, 2.1, -0.8][index]}deg`)
  button.setAttribute('aria-label', `Open photo: ${memory.caption}`)
  button.innerHTML = `
    <img src="${memory.src}" alt="${memory.alt}" loading="lazy" decoding="async" draggable="false" />
    <span>${memory.caption}</span>
  `
  button.addEventListener('click', () => {
    if (filmStrip.dataset.wasDragged === 'true') return
    lightbox.open(memory)
  })
  filmRail.append(button)
})

cleanup.push(installDragScroll(filmStrip))
cleanup.push(createAmbientSparkles(ambientLayer, profile.particles))
cleanup.push(installCursorTrail({ enabled: profile.pointerTrail }))
cleanup.push(observeReveals())

const heroCanvas = document.getElementById('hero-kitty-canvas')
const dreamCanvas = document.getElementById('dream-kitty-canvas')
const finalCanvas = document.getElementById('final-kitty-canvas')

function createKitty(canvas, model, compactFitDelta = 0) {
  return new Kitty3D(canvas, {
    modelUrl: model.url,
    baseRotationY: model.frontRotationY,
    fitSize: compact ? model.fitSize + compactFitDelta : model.fitSize,
    cameraZ: model.cameraZ,
    verticalOffset: model.verticalOffset,
    autoRotateSpeed: compact ? 0.00024 : 0.0003,
    dragSensitivity: compact ? 0.0095 : 0.0075,
  })
}

const heroKitty = createKitty(heroCanvas, kittyModels[0], -0.22)
const dreamKitty = createKitty(dreamCanvas, kittyModels[1], -0.18)
const finalKitty = createKitty(finalCanvas, kittyModels[2], -0.16)
const kittyInstances = [heroKitty, dreamKitty, finalKitty]
const kittyCanvases = [heroCanvas, dreamCanvas, finalCanvas]

function initKittyWhenNear(canvas, instance, { eager = false } = {}) {
  if (eager || !('IntersectionObserver' in window)) {
    instance.init()
    return () => {}
  }

  let initialized = false
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || initialized) return
      initialized = true
      observer.disconnect()
      instance.init()
    },
    { rootMargin: compact ? '420px 0px' : '700px 0px' },
  )
  observer.observe(canvas)
  return () => observer.disconnect()
}

cleanup.push(initKittyWhenNear(heroCanvas, heroKitty, { eager: true }))
cleanup.push(initKittyWhenNear(dreamCanvas, dreamKitty))
cleanup.push(initKittyWhenNear(finalCanvas, finalKitty))

function wireCanvas(canvas, instance) {
  let startX = 0
  let startY = 0
  let activePointerId = null

  const setHoverPointer = (event) => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    instance.setPointer(x, y)
  }

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    activePointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    canvas.dataset.wasDragged = 'false'
    canvas.classList.add('is-dragging')
    try {
      canvas.setPointerCapture?.(event.pointerId)
    } catch {
      // Synthetic events and a few embedded browsers can reject pointer capture.
    }
    instance.beginDrag(event.clientX, event.clientY)
  }

  const onPointerMove = (event) => {
    if (activePointerId === event.pointerId && instance.dragging) {
      instance.dragTo(event.clientX, event.clientY)
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 5) {
        canvas.dataset.wasDragged = 'true'
      }
      return
    }
    setHoverPointer(event)
  }

  const finishDrag = (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return
    try {
      if (activePointerId !== null && canvas.hasPointerCapture?.(activePointerId)) {
        canvas.releasePointerCapture(activePointerId)
      }
    } catch {
      // Keep the interaction usable even if capture was already released.
    }
    activePointerId = null
    canvas.classList.remove('is-dragging')
    instance.endDrag()
    instance.setPointer(0, 0)
  }

  const resetHover = () => {
    if (!instance.dragging) instance.setPointer(0, 0)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerup', finishDrag)
  canvas.addEventListener('pointercancel', finishDrag)
  canvas.addEventListener('pointerleave', resetHover, { passive: true })

  cleanup.push(() => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', finishDrag)
    canvas.removeEventListener('pointercancel', finishDrag)
    canvas.removeEventListener('pointerleave', resetHover)
  })
}

kittyCanvases.forEach((canvas, index) => wireCanvas(canvas, kittyInstances[index]))

let kittyClicks = 0
heroCanvas.addEventListener('click', (event) => {
  if (!body.classList.contains('has-entered') || heroCanvas.dataset.wasDragged === 'true') {
    heroCanvas.dataset.wasDragged = 'false'
    return
  }
  kittyClicks += 1
  heartBurst(event.clientX, event.clientY, kittyClicks >= 5 ? 24 : 7, {
    spread: kittyClicks >= 5 ? 150 : 58,
  })

  if (kittyClicks === 5) {
    showToast('♡ overload ♡', 2600)
    kittyClicks = 0
  }
})

dreamCanvas.addEventListener('click', (event) => {
  if (dreamCanvas.dataset.wasDragged === 'true') {
    dreamCanvas.dataset.wasDragged = 'false'
    return
  }
  heartBurst(event.clientX, event.clientY, 10, { spread: 75 })
})

finalCanvas.addEventListener('click', (event) => {
  if (finalCanvas.dataset.wasDragged === 'true') {
    finalCanvas.dataset.wasDragged = 'false'
    return
  }
  heartBurst(event.clientX, event.clientY, 12, { spread: 82 })
})

for (const canvas of kittyCanvases) {
  canvas.addEventListener('kitty:model-error', () => {
    const fallback = canvas.parentElement?.querySelector('[data-kitty-fallback]')
    fallback?.classList.add('is-visible')
  })
}

function enterWorld() {
  const rect = enterButton.getBoundingClientRect()
  heartBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 20, { spread: 130 })
  intro.classList.add('is-leaving')
  body.classList.add('has-entered')
  body.classList.remove('is-locked')
  main.inert = false
  setTimeout(() => {
    intro.hidden = true
    document.querySelector('.soft-link')?.focus({ preventScroll: true })
  }, reducedMotion ? 10 : 560)
}

enterButton.addEventListener('click', enterWorld)

if (new URLSearchParams(window.location.search).get('preview') === '1') {
  window.setTimeout(enterWorld, 80)
}

if (profile.parallax) {
  const parallaxNodes = [...document.querySelectorAll('.parallax')]
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  let frame = 0

  const animateParallax = () => {
    currentX += (targetX - currentX) * 0.06
    currentY += (targetY - currentY) * 0.06
    for (const node of parallaxNodes) {
      const depth = Number(node.dataset.depth || 0.4)
      node.style.translate = `${currentX * depth * 20}px ${currentY * depth * 15}px`
    }
    frame = requestAnimationFrame(animateParallax)
  }

  const onPointer = (event) => {
    targetX = event.clientX / window.innerWidth - 0.5
    targetY = event.clientY / window.innerHeight - 0.5
  }

  window.addEventListener('pointermove', onPointer, { passive: true })
  frame = requestAnimationFrame(animateParallax)
  cleanup.push(() => {
    window.removeEventListener('pointermove', onPointer)
    cancelAnimationFrame(frame)
  })
}

const secretSticker = document.getElementById('secret-sticker')
const secretMessage = document.getElementById('secret-message')
let secretUnlocked = false

function unlockSecret(x, y) {
  if (secretUnlocked) return
  secretUnlocked = true
  secretMessage.classList.add('is-revealed')
  showToast('secret unlocked ✦')
  const rect = secretMessage.getBoundingClientRect()
  heartBurst(rect.left + rect.width / 2 + x * 0.05, rect.top + rect.height / 2 + y * 0.05, 14, { spread: 90 })
}

cleanup.push(
  makeDraggable(secretSticker, {
    maxDistance: compact ? 115 : 190,
    onMove: ({ x, y }) => {
      if (Math.hypot(x, y) > (compact ? 66 : 88)) unlockSecret(x, y)
    },
  }),
)

secretSticker.addEventListener('click', () => {
  if (secretSticker.dataset.wasDragged === 'true') return
  unlockSecret(0, 0)
})

const starButton = document.getElementById('tiny-star-button')
starButton.addEventListener('click', () => {
  const rect = starButton.getBoundingClientRect()
  heartBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 18, { spread: 110 })
  showToast('you found a tiny sparkle ✦')
})

function updateScrollEffects() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  const progress = window.scrollY / max
  progressHeart.style.top = `${Math.min(100, Math.max(0, progress * 100))}%`

  const hero = document.getElementById('hello').getBoundingClientRect()
  const heroProgress = (window.innerHeight * 0.5 - hero.top) / Math.max(hero.height, 1)
  heroKitty.setScroll((heroProgress - 0.5) * 1.2)

  const dream = document.getElementById('dream').getBoundingClientRect()
  const dreamProgress = (window.innerHeight * 0.5 - dream.top) / Math.max(dream.height, 1)
  dreamKitty.setScroll((dreamProgress - 0.5) * 1.3)

  const final = document.querySelector('.final-section').getBoundingClientRect()
  const finalProgress = (window.innerHeight * 0.5 - final.top) / Math.max(final.height, 1)
  finalKitty.setScroll((finalProgress - 0.5) * 0.9)
}

window.addEventListener('scroll', updateScrollEffects, { passive: true })
updateScrollEffects()
cleanup.push(() => window.removeEventListener('scroll', updateScrollEffects))

let lastFocused = null
function openFinalReveal() {
  lastFocused = document.activeElement
  finalReveal.classList.add('is-open')
  finalReveal.setAttribute('aria-hidden', 'false')
  body.classList.add('is-locked')
  finalRevealClose.focus()
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  heartBurst(centerX, centerY, compact ? 24 : 42, { spread: compact ? 170 : 290 })
}

function closeFinalReveal() {
  finalReveal.classList.remove('is-open')
  finalReveal.setAttribute('aria-hidden', 'true')
  body.classList.remove('is-locked')
  lastFocused?.focus?.()
}

finalRevealButton.addEventListener('click', openFinalReveal)
finalRevealClose.addEventListener('click', closeFinalReveal)
finalReveal.addEventListener('click', (event) => {
  if (event.target === finalReveal) closeFinalReveal()
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && finalReveal.classList.contains('is-open')) {
    closeFinalReveal()
  }
})

window.addEventListener('beforeunload', () => {
  cleanup.forEach((dispose) => dispose?.())
  kittyInstances.forEach((instance) => instance.destroy())
})

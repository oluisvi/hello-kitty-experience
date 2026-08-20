import { memories } from './data/memories.js'
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
const heroKitty = new Kitty3D(heroCanvas, {
  baseRotationY: 0,
  fitSize: compact ? 2.55 : 2.85,
  verticalOffset: compact ? -0.02 : -0.08,
})
const dreamKitty = new Kitty3D(dreamCanvas, {
  baseRotationY: 0.06,
  fitSize: compact ? 2.45 : 2.72,
  cameraZ: 5.35,
  verticalOffset: -0.04,
})

heroKitty.init()
dreamKitty.init()

function wireCanvas(canvas, instance) {
  const move = (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    instance.setPointer(x, y)
  }
  const reset = () => instance.setPointer(0, 0)
  canvas.addEventListener('pointermove', move, { passive: true })
  canvas.addEventListener('pointerleave', reset, { passive: true })
  cleanup.push(() => {
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerleave', reset)
  })
}

wireCanvas(heroCanvas, heroKitty)
wireCanvas(dreamCanvas, dreamKitty)

let kittyClicks = 0
heroCanvas.addEventListener('click', (event) => {
  if (!body.classList.contains('has-entered')) return
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
  heartBurst(event.clientX, event.clientY, 10, { spread: 75 })
})

for (const canvas of [heroCanvas, dreamCanvas]) {
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
  heroKitty.destroy()
  dreamKitty.destroy()
})

export function motionProfile({ reduced, compact }) {
  if (reduced) {
    return {
      particles: 0,
      parallax: false,
      pointerTrail: false,
      autoFloat: false,
    }
  }

  if (compact) {
    return {
      particles: 10,
      parallax: false,
      pointerTrail: false,
      autoFloat: true,
    }
  }

  return {
    particles: 24,
    parallax: true,
    pointerTrail: true,
    autoFloat: true,
  }
}

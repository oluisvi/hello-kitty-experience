export function createLightbox(dialog) {
  const image = dialog.querySelector('[data-lightbox-image]')
  const caption = dialog.querySelector('[data-lightbox-caption]')
  const note = dialog.querySelector('[data-lightbox-note]')
  const closeButton = dialog.querySelector('[data-lightbox-close]')

  const close = () => {
    if (dialog.open) dialog.close()
  }

  const open = (memory) => {
    image.src = memory.src
    image.alt = memory.alt
    caption.textContent = memory.caption
    note.textContent = memory.note
    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
  }

  closeButton.addEventListener('click', close)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    close()
  })

  return { open, close }
}

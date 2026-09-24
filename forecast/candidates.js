// THROWAWAY PROTOTYPE: independent playback for real four-frame hole candidates.
document.querySelectorAll("[data-sequence]").forEach(card => {
  const frames = [...card.querySelectorAll("[data-candidate-frame]")]
  const buttons = [...card.querySelectorAll("[data-frame-button]")]
  const stamp = card.querySelector("[data-frame-stamp]")
  const play = card.querySelector("[data-play]")
  let index = 0
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let timer = null

  function render() {
    frames.forEach((frame, frameIndex) => frame.classList.toggle("is-current", frameIndex === index))
    buttons.forEach((button, buttonIndex) => button.classList.toggle("is-current", buttonIndex === index))
    stamp.textContent = frames[index].alt.replace(/^.* at /, "")
    play.textContent = playing ? "Pause" : "Play"
    play.setAttribute("aria-pressed", String(playing))
  }

  function schedule() {
    clearInterval(timer)
    if (playing) timer = setInterval(() => {
      index = (index + 1) % frames.length
      render()
    }, 1200)
  }

  buttons.forEach(button => button.addEventListener("click", () => {
    index = Number(button.dataset.frameButton)
    playing = false
    render()
    schedule()
  }))

  play.addEventListener("click", () => {
    playing = !playing
    render()
    schedule()
  })

  render()
  schedule()
})

// THROWAWAY PROTOTYPE: URL-stable switcher for three rules-page structures.
const variants = [
  { key: "briefing", label: "A · Tee briefing" },
  { key: "field-guide", label: "B · Field guide" },
  { key: "scorecard", label: "C · Scorecard" }
]

const params = new URLSearchParams(window.location.search)
let current = Math.max(0, variants.findIndex(variant => variant.key === params.get("variant")))

function showVariant(index) {
  current = (index + variants.length) % variants.length
  const selected = variants[current]
  document.querySelectorAll("[data-rules-variant]").forEach(section => {
    section.hidden = section.dataset.rulesVariant !== selected.key
  })
  document.querySelector("[data-variant-label]").textContent = selected.label
  params.set("variant", selected.key)
  window.history.replaceState({}, "", `${window.location.pathname}?${params}`)
  window.scrollTo({ top: 0, behavior: "instant" })
}

document.querySelector("[data-variant-previous]").addEventListener("click", () => showVariant(current - 1))
document.querySelector("[data-variant-next]").addEventListener("click", () => showVariant(current + 1))
document.addEventListener("keydown", event => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return
  if (event.key === "ArrowLeft") showVariant(current - 1)
  if (event.key === "ArrowRight") showVariant(current + 1)
})

showVariant(current)

// THROWAWAY PROTOTYPE: four-ball target scoring over four fixed radar frames.
const frameTimes = ["2:10 PM", "2:20 PM", "2:30 PM", "2:40 PM"]
const targetFrames = [
  [
    { name: "Safe shelf", x: 235, y: 325, r: 70, value: 150, color: "#76c77a" },
    { name: "Lake carry", x: 455, y: 295, r: 52, value: 350, color: "#00e5d4" },
    { name: "Storm pocket", x: 675, y: 165, r: 37, value: 650, color: "#fdd835" },
    { name: "Gawd mark", x: 855, y: 320, r: 25, value: 1000, color: "#f57c00" }
  ],
  [
    { name: "Safe shelf", x: 250, y: 318, r: 70, value: 150, color: "#76c77a" },
    { name: "Lake carry", x: 470, y: 285, r: 52, value: 350, color: "#00e5d4" },
    { name: "Storm pocket", x: 700, y: 178, r: 37, value: 650, color: "#fdd835" },
    { name: "Gawd mark", x: 875, y: 305, r: 25, value: 1000, color: "#f57c00" }
  ],
  [
    { name: "Safe shelf", x: 262, y: 312, r: 70, value: 150, color: "#76c77a" },
    { name: "Lake carry", x: 492, y: 275, r: 52, value: 350, color: "#00e5d4" },
    { name: "Storm pocket", x: 722, y: 190, r: 37, value: 650, color: "#fdd835" },
    { name: "Gawd mark", x: 895, y: 292, r: 25, value: 1000, color: "#f57c00" }
  ],
  [
    { name: "Safe shelf", x: 278, y: 305, r: 70, value: 150, color: "#76c77a" },
    { name: "Lake carry", x: 510, y: 266, r: 52, value: 350, color: "#00e5d4" },
    { name: "Storm pocket", x: 748, y: 205, r: 37, value: 650, color: "#fdd835" },
    { name: "Gawd mark", x: 915, y: 280, r: 25, value: 1000, color: "#f57c00" }
  ]
]

const board = document.querySelector("[data-board]")
const overlay = board.querySelector(".board-overlay")
const targetLayer = document.querySelector("[data-target-layer]")
const aimLine = document.querySelector("[data-aim-line]")
const aimMarker = document.querySelector("[data-aim-marker]")
const ball = document.querySelector("[data-ball]")
const trails = document.querySelector("[data-shot-trails]")
const shootButton = document.querySelector("[data-shoot]")
const log = document.querySelector("[data-event-log]")

let state

function reset() {
  state = { frame: 0, score: 0, shots: [], aim: { x: 235, y: 325 }, locked: false }
  trails.replaceChildren()
  render()
}

function svgPoint(event) {
  const rect = overlay.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(978, ((event.clientX - rect.left) / rect.width) * 978)),
    y: Math.max(0, Math.min(490, ((event.clientY - rect.top) / rect.height) * 490))
  }
}

function aim(event) {
  if (state.locked || state.frame >= 4) return
  state.aim = svgPoint(event)
  renderAim()
  document.querySelector("[data-instruction]").textContent = "Aim set. Shoot when ready."
}

function ringMarkup(target) {
  return `<g aria-label="${target.name}, ${target.value} points">
    <circle cx="${target.x}" cy="${target.y}" r="${target.r}" fill="${target.color}" fill-opacity=".14" stroke="${target.color}" stroke-width="5"/>
    <circle cx="${target.x}" cy="${target.y}" r="${target.r * .45}" fill="${target.color}" fill-opacity=".2" stroke="#fff" stroke-width="3"/>
    <text x="${target.x}" y="${target.y + 7}" fill="#fff" font-size="19" font-weight="1000" text-anchor="middle">${target.value}</text>
  </g>`
}

function renderTargets() {
  targetLayer.innerHTML = state.frame < 4 ? targetFrames[state.frame].map(ringMarkup).join("") : ""
  const targets = state.frame < 4 ? targetFrames[state.frame] : targetFrames[3]
  document.querySelector("[data-target-list]").innerHTML = targets.map(target =>
    `<li><span class="target-key" style="color:${target.color}"><i class="target-dot"></i>${target.name}</span><strong>${target.value}</strong></li>`
  ).join("")
}

function renderAim() {
  aimLine.setAttribute("x2", state.aim.x)
  aimLine.setAttribute("y2", state.aim.y)
  aimMarker.setAttribute("cx", state.aim.x)
  aimMarker.setAttribute("cy", state.aim.y)
}

function scoreShot(point, targets) {
  let result = { points: 0, label: "Miss" }
  targets.forEach(target => {
    const distance = Math.hypot(point.x - target.x, point.y - target.y)
    const points = distance <= target.r * .45 ? target.value : distance <= target.r ? Math.round(target.value / 2) : 0
    if (points > result.points) result = { points, label: `${target.name}${points === target.value ? " bullseye" : " outer ring"}` }
  })
  return result
}

function shoot() {
  if (state.locked || state.frame >= 4) return
  state.locked = true
  shootButton.disabled = true
  const start = { x: 489, y: 470 }
  const end = { ...state.aim }
  const result = scoreShot(end, targetFrames[state.frame])
  const shotNumber = state.frame + 1
  ball.animate([
    { transform: `translate(0 0) scale(1)` },
    { transform: `translate(${(end.x - start.x) * .55}px, ${(end.y - start.y) * .55 - 70}px) scale(.72)`, offset: .55 },
    { transform: `translate(${end.x - start.x}px, ${end.y - start.y}px) scale(.9)` }
  ], { duration: 560, easing: "cubic-bezier(.22,.8,.3,1)" })

  window.setTimeout(() => {
    trails.insertAdjacentHTML("beforeend", `<line x1="489" y1="470" x2="${end.x}" y2="${end.y}" stroke="#fff" stroke-width="3" opacity=".5"/><circle cx="${end.x}" cy="${end.y}" r="7" fill="#fff" stroke="#10151a" stroke-width="3"/>`)
    state.score += result.points
    state.shots.push({ ...result, point: end })
    addLog(`Ball ${shotNumber}: ${result.label} · ${result.points ? `+${result.points}` : "0"}`)
    state.frame += 1
    state.locked = false
    if (state.frame < 4) state.aim = { x: targetFrames[state.frame][0].x, y: targetFrames[state.frame][0].y }
    render()
  }, 570)
}

function addLog(message) {
  log.insertAdjacentHTML("afterbegin", `<li>${message}</li>`)
}

function render() {
  document.querySelectorAll(".radar-frame").forEach((frame, index) => frame.classList.toggle("is-current", index === Math.min(state.frame, 3)))
  document.querySelectorAll(".frame-chip").forEach((chip, index) => chip.classList.toggle("is-current", index === Math.min(state.frame, 3)))
  document.querySelector("[data-frame-clock]").textContent = `Radar ${frameTimes[Math.min(state.frame, 3)]}`
  document.querySelector("[data-score]").textContent = state.score.toLocaleString()
  document.querySelector("[data-board-score]").textContent = state.frame >= 4 ? state.score.toLocaleString() : "—"
  const hits = state.shots.filter(shot => shot.points > 0)
  document.querySelector("[data-best]").textContent = hits.length ? Math.max(...hits.map(shot => shot.points)).toLocaleString() : "—"
  document.querySelector("[data-accuracy]").textContent = state.shots.length ? `${Math.round((hits.length / state.shots.length) * 100)}%` : "—"
  document.querySelector("[data-score-meta]").textContent = state.frame >= 4 ? "Card complete · Try another route" : `Ball ${state.frame + 1} of 4 · ${4 - state.frame} remaining`
  document.querySelector("[data-instruction]").textContent = state.frame >= 4 ? `Final score: ${state.score.toLocaleString()}. Could a different risk mix beat it?` : `Tap or click a target to aim ball ${state.frame + 1}.`
  shootButton.textContent = state.frame >= 4 ? "Card complete" : `Shoot ball ${state.frame + 1}`
  shootButton.disabled = state.frame >= 4 || state.locked
  aimLine.hidden = state.frame >= 4
  aimMarker.hidden = state.frame >= 4
  renderTargets()
  renderAim()
}

board.addEventListener("pointerdown", aim)
shootButton.addEventListener("click", shoot)
document.querySelector("[data-reset]").addEventListener("click", () => {
  log.innerHTML = "<li>New card. Four balls remain.</li>"
  reset()
})
reset()

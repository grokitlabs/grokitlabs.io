// THROWAWAY PROTOTYPE: a persistent ball, optional waypoints, and a moving radar board.
const frameTimes = ["2:10 PM", "2:20 PM", "2:30 PM", "2:40 PM"]
const clubs = {
  driver: { label: "Driver", reach: 320 },
  iron: { label: "Iron", reach: 235 },
  wedge: { label: "Wedge", reach: 150 }
}
const waypointFrames = [
  [
    { id: "anchor", name: "Anchor", x: 310, y: 350, r: 31, value: 2, color: "#76c77a", moves: false },
    { id: "rider", name: "Rider", x: 505, y: 260, r: 29, value: 4, color: "#00e5d4", moves: true },
    { id: "gawd", name: "Gawd mark", x: 675, y: 175, r: 25, value: 6, color: "#fdd835", moves: true }
  ],
  [
    { id: "anchor", name: "Anchor", x: 310, y: 350, r: 31, value: 2, color: "#76c77a", moves: false },
    { id: "rider", name: "Rider", x: 535, y: 250, r: 29, value: 4, color: "#00e5d4", moves: true },
    { id: "gawd", name: "Gawd mark", x: 705, y: 188, r: 25, value: 6, color: "#fdd835", moves: true }
  ],
  [
    { id: "anchor", name: "Anchor", x: 310, y: 350, r: 31, value: 2, color: "#76c77a", moves: false },
    { id: "rider", name: "Rider", x: 565, y: 238, r: 29, value: 4, color: "#00e5d4", moves: true },
    { id: "gawd", name: "Gawd mark", x: 738, y: 198, r: 25, value: 6, color: "#fdd835", moves: true }
  ],
  [
    { id: "anchor", name: "Anchor", x: 310, y: 350, r: 31, value: 2, color: "#76c77a", moves: false },
    { id: "rider", name: "Rider", x: 595, y: 226, r: 29, value: 4, color: "#00e5d4", moves: true },
    { id: "gawd", name: "Gawd mark", x: 770, y: 210, r: 25, value: 6, color: "#fdd835", moves: true }
  ]
]

const cup = { x: 855, y: 90, r: 34 }
const board = document.querySelector("[data-board]")
const overlay = board.querySelector(".board-overlay")
const waypointLayer = document.querySelector("[data-waypoint-layer]")
const aimLine = document.querySelector("[data-aim-line]")
const aimMarker = document.querySelector("[data-aim-marker]")
const ball = document.querySelector("[data-ball]")
const trails = document.querySelector("[data-shot-trails]")
const shootButton = document.querySelector("[data-shoot]")
const log = document.querySelector("[data-event-log]")

let state

function reset() {
  state = {
    frame: 0, strokes: 0, points: 0, score: 0, ball: { x: 120, y: 410 }, aim: { x: 370, y: 310 },
    club: "driver", collected: new Set(), complete: false, failed: false, locked: false, lie: "Fairway"
  }
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

function clampedAim(point) {
  const dx = point.x - state.ball.x
  const dy = point.y - state.ball.y
  const distance = Math.hypot(dx, dy)
  const reach = clubs[state.club].reach
  if (distance <= reach) return point
  return { x: state.ball.x + (dx / distance) * reach, y: state.ball.y + (dy / distance) * reach }
}

function aim(event) {
  if (state.complete || state.failed || state.locked) return
  state.aim = clampedAim(svgPoint(event))
  renderAim()
  document.querySelector("[data-instruction]").textContent = `${clubs[state.club].label} landing point set. Take the shot.`
}

function waypointMarkup(point) {
  const collected = state.collected.has(point.id)
  return `<g opacity="${collected ? .3 : 1}" aria-label="${point.name}, ${point.value} points">
    <circle cx="${point.x}" cy="${point.y}" r="${point.r}" fill="${point.color}" fill-opacity=".18" stroke="${point.color}" stroke-width="5" ${point.moves ? 'stroke-dasharray="9 7"' : ""}/>
    <text x="${point.x}" y="${point.y + 7}" fill="#fff" font-size="19" font-weight="1000" text-anchor="middle">${collected ? "✓" : `+${point.value}`}</text>
  </g>`
}

function renderWaypoints() {
  waypointLayer.innerHTML = waypointFrames[state.frame].map(waypointMarkup).join("")
}

function renderAim() {
  aimLine.setAttribute("x1", state.ball.x)
  aimLine.setAttribute("y1", state.ball.y)
  aimLine.setAttribute("x2", state.aim.x)
  aimLine.setAttribute("y2", state.aim.y)
  aimMarker.setAttribute("cx", state.aim.x)
  aimMarker.setAttribute("cy", state.aim.y)
}

function lieAt(point) {
  const yellowCore = Math.hypot(point.x - 670, point.y - 175) < 105
  const lake = point.x > 345 && point.x < 640 && point.y > 270 && point.y < 455
  if (lake) return "Water edge"
  if (yellowCore) return "Storm bunker"
  if (point.y < 235) return "Wet rough"
  return "Fairway"
}

function collectAt(point) {
  return waypointFrames[state.frame].find(waypoint =>
    !state.collected.has(waypoint.id) && Math.hypot(point.x - waypoint.x, point.y - waypoint.y) <= waypoint.r
  )
}

function advanceBoard(riding) {
  if (state.frame >= 3) return
  const oldFrame = state.frame
  state.frame += 1
  if (!riding?.moves) return
  const next = waypointFrames[state.frame].find(point => point.id === riding.id)
  const previous = waypointFrames[oldFrame].find(point => point.id === riding.id)
  state.ball.x += next.x - previous.x
  state.ball.y += next.y - previous.y
  addLog(`${riding.name} carried the ball ${Math.round(Math.hypot(next.x - previous.x, next.y - previous.y))} yards for free.`)
}

function finalScore() {
  const strokeAdjustment = state.strokes < 4 ? (4 - state.strokes) * 3 : (state.strokes - 4) * -3
  return Math.max(0, 10 + state.points + strokeAdjustment)
}

function shoot() {
  if (state.complete || state.failed || state.locked) return
  state.locked = true
  shootButton.disabled = true
  const start = { ...state.ball }
  const end = { ...state.aim }
  const dx = end.x - start.x
  const dy = end.y - start.y
  ball.animate([
    { transform: "translate(0 0) scale(1)" },
    { transform: `translate(${dx * .55}px, ${dy * .55 - 55}px) scale(.72)`, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.92)` }
  ], { duration: 560, easing: "cubic-bezier(.22,.8,.3,1)" })

  window.setTimeout(() => {
    state.strokes += 1
    trails.insertAdjacentHTML("beforeend", `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#fff" stroke-width="3" opacity=".48"/>`)
    state.ball = end
    let waypoint = collectAt(end)
    if (waypoint) {
      state.collected.add(waypoint.id)
      state.points += waypoint.value
      addLog(`Stroke ${state.strokes}: collected ${waypoint.name} · +${waypoint.value}.`)
    } else {
      addLog(`Stroke ${state.strokes}: ${clubs[state.club].label} found ${lieAt(end).toLowerCase()}.`)
    }

    if (Math.hypot(state.ball.x - cup.x, state.ball.y - cup.y) <= cup.r) {
      state.complete = true
      state.score = finalScore()
      state.ball = { x: cup.x, y: cup.y }
      addLog(`Holed out in ${state.strokes}. Final score ${state.score}.`)
    } else {
      advanceBoard(waypoint)
      state.lie = lieAt(state.ball)
      if (state.strokes >= 6) {
        state.failed = true
        state.score = 0
        addLog("Six-stroke limit reached. The card scores zero.")
      }
      state.aim = clampedAim({ x: cup.x, y: cup.y })
    }
    state.locked = false
    render()
  }, 570)
}

function addLog(message) {
  log.insertAdjacentHTML("afterbegin", `<li>${message}</li>`)
}

function render() {
  document.querySelectorAll(".radar-frame").forEach((frame, index) => frame.classList.toggle("is-current", index === state.frame))
  document.querySelectorAll(".frame-chip").forEach((chip, index) => chip.classList.toggle("is-current", index === state.frame))
  document.querySelector("[data-frame-clock]").textContent = `Radar ${frameTimes[state.frame]}`
  document.querySelector("[data-score]").textContent = state.complete || state.failed ? state.score : state.points
  document.querySelector("[data-strokes]").textContent = `${state.strokes} / 6`
  document.querySelector("[data-points]").textContent = `${state.points} pts`
  document.querySelector("[data-board-score]").textContent = state.complete || state.failed ? state.score : "—"
  document.querySelector("[data-score-meta]").textContent = state.complete ? `Complete in ${state.strokes} · ${state.points} waypoint points` : state.failed ? "Card failed · No score banked" : `Stroke ${state.strokes + 1} · ${state.lie} lie`
  document.querySelector("[data-instruction]").textContent = state.complete ? `Score banked: ${state.score}. Which route could beat it?` : state.failed ? "The card scored zero. Try a safer route." : `Choose a club, then tap or click a landing point.`
  shootButton.textContent = state.complete || state.failed ? "Hole complete" : `Take stroke ${state.strokes + 1}`
  shootButton.disabled = state.complete || state.failed || state.locked
  aimLine.hidden = state.complete || state.failed
  aimMarker.hidden = state.complete || state.failed
  ball.setAttribute("cx", state.ball.x)
  ball.setAttribute("cy", state.ball.y)
  document.querySelectorAll("[data-club]").forEach(button => button.classList.toggle("is-selected", button.dataset.club === state.club))
  renderWaypoints()
  renderAim()
}

board.addEventListener("pointerdown", aim)
shootButton.addEventListener("click", shoot)
document.querySelectorAll("[data-club]").forEach(button => button.addEventListener("click", () => {
  if (state.complete || state.failed || state.locked) return
  state.club = button.dataset.club
  state.aim = clampedAim(state.aim)
  render()
}))
document.querySelector("[data-reset]").addEventListener("click", () => {
  log.innerHTML = "<li>Back on the tee. Six-stroke limit.</li>"
  reset()
})
reset()

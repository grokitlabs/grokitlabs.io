// THROWAWAY PROTOTYPE: precipitation-as-platform, next-frame aiming, and surface-aware roll.
window.ForeCastGame = (() => {
  const width = 978
  const height = 490
  const holes = [
    {
      id: 1,
      name: "Breakwater Bend",
      place: "Cleveland",
      date: "September 23, 2026",
      par: 3,
      strokeCap: 7,
      summary: "A short lakefront opener played across a rain band that keeps pulling away from the tee.",
      challenges: ["Use the next frame to find the landing corridor.", "The lake and the radar edge punish a miss.", "Small storm-edge targets trade safety for points."],
      times: ["2:10 PM", "2:20 PM", "2:30 PM", "2:40 PM"],
      images: ["assets/forecast-radar-2110.png", "assets/forecast-radar-2120.png", "assets/forecast-radar-2130.png", "assets/forecast-radar-2140.png"],
      flyover: "assets/flyover-breakwater.png",
      tee: { x: 140, y: 180 },
      cup: { x: 840, y: 230, r: 11 },
      targets: {
        1: { safe: { x: 340, y: 170 }, window: { x: 390, y: 180 }, gawd: { x: 430, y: 210 } },
        2: { safe: { x: 550, y: 220 }, window: { x: 640, y: 210 }, gawd: { x: 700, y: 260 } },
        3: { safe: { x: 650, y: 250 }, window: { x: 700, y: 260 }, gawd: { x: 740, y: 280 } }
      }
    },
    {
      id: 2,
      name: "Shattered Shore",
      place: "Cleveland",
      date: "August 11, 2026",
      par: 4,
      strokeCap: 8,
      summary: "A long par 4 across broken radar platforms with no single safe line to the cup.",
      challenges: ["Choose a wide layup or jump to the narrow center.", "Disconnected rain makes every rollout matter.", "The final approach tightens near the shoreline."],
      times: ["6:20 PM", "6:30 PM", "6:40 PM", "6:50 PM"],
      images: ["assets/candidates/aug11-1.png", "assets/candidates/aug11-2.png", "assets/candidates/aug11-3.png", "assets/candidates/aug11-4.png"],
      flyover: "assets/flyover-aug11.png",
      tee: { x: 280, y: 250 },
      cup: { x: 880, y: 420, r: 11 },
      targets: {
        1: { safe: { x: 532, y: 232 }, window: { x: 540, y: 216 }, gawd: { x: 612, y: 240 } },
        2: { safe: { x: 556, y: 288 }, window: { x: 508, y: 304 }, gawd: { x: 676, y: 216 } },
        3: { safe: { x: 716, y: 232 }, window: { x: 668, y: 360 }, gawd: { x: 756, y: 168 } }
      }
    },
    {
      id: 3,
      name: "Backwash",
      place: "Cleveland",
      date: "August 30, 2026",
      par: 4,
      strokeCap: 8,
      summary: "A reverse-direction par 4 that asks you to read the storm from east to west.",
      challenges: ["The course moves against the usual visual flow.", "High islands offer points but little room for roll.", "Plan two frames ahead before committing left."],
      times: ["9:10 AM", "9:20 AM", "9:30 AM", "9:40 AM"],
      images: ["assets/candidates/aug30-1.png", "assets/candidates/aug30-2.png", "assets/candidates/aug30-3.png", "assets/candidates/aug30-4.png"],
      flyover: "assets/flyover-aug30.png",
      tee: { x: 836, y: 188 },
      cup: { x: 212, y: 192, r: 11 },
      targets: {
        1: { safe: { x: 704, y: 250 }, window: { x: 680, y: 120 }, gawd: { x: 600, y: 100 } },
        2: { safe: { x: 440, y: 108 }, window: { x: 448, y: 140 }, gawd: { x: 428, y: 72 } },
        3: { safe: { x: 364, y: 304 }, window: { x: 300, y: 220 }, gawd: { x: 428, y: 76 } }
      }
    },
    {
      id: 4,
      name: "Anvil Crossing",
      place: "Cleveland",
      date: "August 10, 2026",
      par: 5,
      strokeCap: 9,
      summary: "A long dogleg threaded around the strongest cells on the course.",
      challenges: ["Build position before attacking the far side.", "Yellow cores turn aggressive lines into penalty drops.", "The closing corridor shifts on every frame."],
      times: ["8:30 AM", "8:40 AM", "8:50 AM", "9:00 AM"],
      images: ["assets/candidates/aug10-1.png", "assets/candidates/aug10-2.png", "assets/candidates/aug10-3.png", "assets/candidates/aug10-4.png"],
      flyover: "assets/flyover-aug10.png",
      tee: { x: 120, y: 160 },
      cup: { x: 900, y: 160, r: 11 },
      targets: {
        1: { safe: { x: 400, y: 250 }, window: { x: 350, y: 200 }, gawd: { x: 412, y: 94 } },
        2: { safe: { x: 640, y: 322 }, window: { x: 628, y: 322 }, gawd: { x: 676, y: 304 } },
        3: { safe: { x: 698, y: 322 }, window: { x: 746, y: 256 }, gawd: { x: 806, y: 232 } }
      }
    }
  ]
  const requestedHole = Number(new URLSearchParams(window.location.search).get("hole"))
  const hole = holes.find(candidate => candidate.id === requestedHole) || holes[0]
  const par = hole.par
  const strokeCap = hole.strokeCap
  const cup = hole.cup
  const tee = hole.tee
  const clubs = {
    driver: { label: "Driver", reach: 335, rollSpeed: 7.5 },
    iron: { label: "Iron", reach: 245, rollSpeed: 6 },
    wedge: { label: "Wedge", reach: 155, rollSpeed: 4 }
  }
  const lieEffects = {
    Tee: { reach: 1, spread: 1, meter: 1 },
    "Light green": { reach: 1, spread: 1, meter: 1 },
    "Deep green": { reach: .96, spread: 1.2, meter: 1.12 },
    Drop: { reach: .9, spread: 1.2, meter: 1.12 }
  }
  const surfaces = {
    light: { label: "Light green", friction: .78, penalty: 0, copy: "Broad, forgiving radar with the longest forward roll." },
    dark: { label: "Deep green", friction: 1.28, penalty: 0, copy: "Narrower, wetter radar that slows the ball faster." },
    earthLand: { label: "Fell to land", friction: Infinity, penalty: 1, copy: "No precipitation at arrival. Fall to Earth, add one stroke, then drop on nearby safe radar." },
    earthWater: { label: "Fell to water", friction: Infinity, penalty: 2, copy: "No precipitation at arrival. Splash down, add two strokes, then drop on nearby safe radar." },
    storm: { label: "Storm hazard", friction: Infinity, penalty: 1, copy: "Yellow-or-worse reflectivity is a hazard. Add one stroke, then drop on nearby safe radar." },
    out: { label: "Off the map", friction: Infinity, penalty: 2, copy: "Outside the playable radar map. Add two strokes, then drop on safe radar." }
  }
  const targetTypes = {
    safe: { name: "Open Green", value: 2, r: 34, color: "#b8f38d" },
    window: { name: "Deep Green", value: 5, r: 29, color: "#00e5d4" },
    gawd: { name: "Storm Edge", value: 8, r: 25, color: "#fdd835" }
  }
  const targetPositions = hole.targets
  function bonusesForFrame(frame) {
    const positions = targetPositions[Math.max(1, Math.min(3, frame))]
    return Object.entries(targetTypes).map(([route, target]) => ({
      ...target, ...positions[route], route, id: `${frame}-${route}`
    }))
  }
  const routes = {
    safe: { color: "#b8f38d" },
    window: { color: "#00e5d4" },
    gawd: { color: "#fdd835" }
  }

  function clampPoint(point) {
    return { x: Math.max(12, Math.min(width - 12, point.x)), y: Math.max(12, Math.min(height - 12, point.y)) }
  }

  function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y) }

  function effectiveClub(state) {
    const club = clubs[state.club]
    const lie = lieEffects[state.lie] || lieEffects["Light green"]
    return { ...club, reach: club.reach * lie.reach, spread: lie.spread, meter: lie.meter }
  }

  function clampAim(state, point) {
    const club = effectiveClub(state)
    const dx = point.x - state.ball.x
    const dy = point.y - state.ball.y
    const length = Math.hypot(dx, dy)
    if (length <= club.reach) return clampPoint(point)
    return clampPoint({ x: state.ball.x + (dx / length) * club.reach, y: state.ball.y + (dy / length) * club.reach })
  }

  function powerTarget(state) {
    return Math.max(12, Math.min(100, distance(state.ball, state.aim) / effectiveClub(state).reach * 100))
  }

  function initialState() {
    const state = {
      frame: 0, view: "current", strokes: 0, penalties: 0, points: 0,
      ball: { ...tee }, aim: { x: 340, y: 170 }, club: "driver", route: "safe",
      lie: "Tee", collected: [], phase: "aim", power: null, accuracy: null,
      complete: false, capped: false, reviewShot: false, lastOutcome: null
    }
    state.aim = clampAim(state, bonusesForFrame(1).find(item => item.route === "safe"))
    return state
  }

  function selectClub(state, club) {
    if (state.phase !== "aim" || state.complete) return state
    const next = { ...state, club }
    return { ...next, aim: clampAim(next, next.aim) }
  }

  function selectRoute(state, route) {
    if (state.phase !== "aim" || state.complete) return state
    const next = { ...state, route }
    const nextFrame = Math.min(next.frame + 1, 3)
    const target = bonusesForFrame(nextFrame).find(item => item.route === route)
    return { ...next, aim: clampAim(next, target) }
  }

  function aim(state, point) {
    if (state.phase !== "aim" || state.complete) return state
    return { ...state, aim: clampAim(state, point) }
  }

  function shotGeometry(state, power, accuracy, readSurface) {
    const club = effectiveClub(state)
    const dx = state.aim.x - state.ball.x
    const dy = state.aim.y - state.ball.y
    const intendedAngle = Math.atan2(dy, dx)
    const angle = intendedAngle + accuracy * .16 * club.spread
    const shotDistance = club.reach * power / 100
    const landing = clampPoint({ x: state.ball.x + Math.cos(angle) * shotDistance, y: state.ball.y + Math.sin(angle) * shotDistance })
    const frame = Math.min(state.frame + 1, 3)
    const landingSurface = readSurface(frame, landing)
    let rest = landing
    let rollExit = surfaces[landingSurface].penalty ? landingSurface : null
    const rollPath = [{ ...landing, distance: 0 }]
    let rollDistance = 0
    if (!rollExit) {
      const strikeQuality = 1 - Math.min(.28, Math.abs(accuracy) * .28)
      const initialSpeed = club.rollSpeed * Math.sqrt(Math.max(.08, power / 100)) * strikeQuality
      let energy = initialSpeed ** 2
      while (energy > 0 && rollDistance < 180) {
        const currentSurface = readSurface(frame, rest)
        const friction = surfaces[currentSurface].friction
        const step = Math.min(2.5, energy / (2 * friction))
        const point = clampPoint({
          x: rest.x + Math.cos(angle) * step,
          y: rest.y + Math.sin(angle) * step
        })
        rollDistance += distance(rest, point)
        rest = point
        const surface = readSurface(frame, rest)
        rollPath.push({ ...rest, distance: rollDistance })
        if (surfaces[surface].penalty) {
          rollExit = surface
          break
        }
        energy = Math.max(0, energy - 2 * friction * step)
      }
    }
    const restSurface = readSurface(frame, rest)
    return { landing, rest, landingSurface, restSurface, rollDistance, rollPath, frame, rollExit }
  }

  function safeDrop(frame, hazardPoint, shotStart, readSurface) {
    const playable = point => {
      const center = readSurface(frame, point)
      if (surfaces[center].penalty) return false
      return [[6, 0], [-6, 0], [0, 6], [0, -6]].every(([dx, dy]) =>
        !surfaces[readSurface(frame, clampPoint({ x: point.x + dx, y: point.y + dy }))].penalty
      )
    }
    const backTowardShot = Math.atan2(shotStart.y - hazardPoint.y, shotStart.x - hazardPoint.x)
    const angleOffsets = [0, .28, -.28, .56, -.56, .84, -.84, 1.12, -1.12, Math.PI]
    for (let radius = 16; radius <= 144; radius += 8) {
      for (const offset of angleOffsets) {
        const candidate = clampPoint({
          x: hazardPoint.x + Math.cos(backTowardShot + offset) * radius,
          y: hazardPoint.y + Math.sin(backTowardShot + offset) * radius
        })
        if (playable(candidate)) return candidate
      }
    }

    let nearest = null
    let nearestDistance = Infinity
    for (let y = 20; y < height - 20; y += 8) {
      for (let x = 20; x < width - 20; x += 8) {
        const candidate = { x, y }
        const candidateDistance = distance(hazardPoint, candidate)
        if (candidateDistance < nearestDistance && playable(candidate)) {
          nearest = candidate
          nearestDistance = candidateDistance
        }
      }
    }
    return nearest || { ...tee }
  }

  function resolveShot(state, power, accuracy, readSurface, availableBonuses = bonusesForFrame(Math.min(state.frame + 1, 3)), containsBonus = (item, point) => distance(point, item) <= item.r) {
    const geometry = shotGeometry(state, power, accuracy, readSurface)
    const hazard = surfaces[geometry.landingSurface].penalty ? geometry.landingSurface : geometry.rollExit
    let ball = geometry.rest
    let lie = surfaces[geometry.restSurface].label
    let penalties = state.penalties
    let strokes = state.strokes + 1
    let points = state.points
    let collected = [...state.collected]
    let bonus = null

    if (hazard) {
      const penaltyStrokes = surfaces[hazard].penalty
      penalties += penaltyStrokes
      strokes += penaltyStrokes
      ball = safeDrop(geometry.frame, geometry.rest, state.ball, readSurface)
      lie = "Drop"
    } else {
      bonus = [...availableBonuses].sort((left, right) => right.value - left.value).find(item => !collected.includes(item.id) && containsBonus(item, ball))
      if (bonus) {
        collected.push(bonus.id)
        points += bonus.value
      }
    }

    const holed = !hazard && distance(ball, cup) <= cup.r
    if (holed) ball = { x: cup.x, y: cup.y }
    const capped = !holed && strokes >= strokeCap
    return {
      state: {
        ...state, frame: geometry.frame, view: "current", reviewShot: false, strokes, penalties, points, collected,
        ball, aim: ball, lie, phase: "aim", power: null, accuracy: null,
        complete: holed || capped, capped,
        lastOutcome: { ...geometry, hazard, bonus, availableBonuses, drop: hazard ? ball : null, power, accuracy, start: { ...state.ball }, end: ball }
      },
      geometry: { ...geometry, hazard, bonus, drop: hazard ? ball : null, start: { ...state.ball }, end: ball }
    }
  }

  function scoreToPar(state) {
    const difference = state.strokes - par
    if (difference === 0) return "E"
    return difference > 0 ? `+${difference}` : `${difference}`
  }

  return { width, height, holes, hole, par, strokeCap, cup, tee, clubs, surfaces, routes, lieEffects, bonusesForFrame, initialState, effectiveClub, clampAim, powerTarget, selectClub, selectRoute, aim, shotGeometry, safeDrop, resolveShot, scoreToPar, distance }
})()

const frameTimes = ForeCastGame.hole.times
const board = document.querySelector("[data-board]")
const boardViewport = document.querySelector("[data-board-viewport]")
const boardZoomButton = document.querySelector("[data-board-zoom-toggle]")
const holeIntro = document.querySelector("[data-hole-intro]")
const startHoleButton = document.querySelector("[data-start-hole]")
const overlay = board.querySelector(".board-overlay")
const ball = document.querySelector("[data-ball]")
const ballLabel = document.querySelector("[data-ball-label]")
const aimLine = document.querySelector("[data-aim-line]")
const aimMarker = document.querySelector("[data-aim-marker]")
const shotCone = document.querySelector("[data-shot-cone]")
const routeLayer = document.querySelector("[data-route-layer]")
const bonusLayer = document.querySelector("[data-bonus-layer]")
const trails = document.querySelector("[data-shot-trails]")
const effects = document.querySelector("[data-shot-effects]")
const swingButton = document.querySelector("[data-swing]")
const replayButton = document.querySelector("[data-replay-shot]")
const shotToast = document.querySelector("[data-shot-toast]")
const log = document.querySelector("[data-event-log]")
const frameImages = [...document.querySelectorAll("[data-frame]")]
const currentHole = ForeCastGame.hole
const roundStorageKey = "forecast-four-hole-round-v1"
const samplers = []
const islandCatalogs = []
const islandGridStep = 4
let state = ForeCastGame.initialState()
let meterFrame = null
let meterStartedAt = 0
let livePower = 0
let liveAccuracy = 50
let audioContext = null

function gameAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  audioContext ||= new AudioContext()
  if (audioContext.state === "suspended") audioContext.resume()
  return audioContext
}

function noiseBurst(context, start, duration, volume, frequency) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  filter.type = "bandpass"
  filter.frequency.value = frequency
  filter.Q.value = .75
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(.001, start + duration)
  source.buffer = buffer
  source.connect(filter).connect(gain).connect(context.destination)
  source.start(start)
  source.stop(start + duration)
}

function playSwingSound() {
  const context = gameAudio()
  if (!context) return
  const now = context.currentTime
  noiseBurst(context, now, .22, .09, 850)
  noiseBurst(context, now + .19, .07, .2, 2400)
  const strike = context.createOscillator()
  const gain = context.createGain()
  strike.type = "triangle"
  strike.frequency.setValueAtTime(190, now + .19)
  strike.frequency.exponentialRampToValueAtTime(95, now + .27)
  gain.gain.setValueAtTime(.12, now + .19)
  gain.gain.exponentialRampToValueAtTime(.001, now + .29)
  strike.connect(gain).connect(context.destination)
  strike.start(now + .19)
  strike.stop(now + .3)
}

function playGolfClap() {
  const context = gameAudio()
  if (!context) return
  const now = context.currentTime + .08
  const beats = [0, .08, .15, .25, .34, .47, .58, .7]
  beats.forEach((offset, index) => noiseBurst(context, now + offset, .055, .035 + (index % 3) * .012, 1300 + (index % 2) * 450))
}

function holeUrl(holeId) {
  const url = new URL(window.location.href)
  url.searchParams.set("hole", holeId)
  url.searchParams.delete("play")
  return `${url.pathname}${url.search}`
}

function readRound() {
  try { return JSON.parse(window.localStorage.getItem(roundStorageKey)) || {} }
  catch { return {} }
}

function writeRound(round) {
  try { window.localStorage.setItem(roundStorageKey, JSON.stringify(round)) }
  catch { /* A private browser can refuse storage; the hole remains playable. */ }
}

function configureHole() {
  document.title = `Fore!Cast — Hole ${currentHole.id}: ${currentHole.name}`
  const timeWindow = `${currentHole.times[0]}–${currentHole.times.at(-1)}`
  document.querySelector("[data-hole-meta]").textContent = `Hole ${currentHole.id} · ${currentHole.place} · ${currentHole.date} · ${timeWindow} · Par ${currentHole.par}`
  document.querySelector("[data-hole-name]").textContent = currentHole.name
  document.querySelector("[data-scorecard-name]").textContent = currentHole.name
  document.querySelector("[data-board-shell]").setAttribute("aria-label", `${currentHole.name} course board`)
  document.querySelector(".cup-marker--flag").setAttribute("transform", `translate(${currentHole.cup.x - 840} ${currentHole.cup.y - 230})`)
  frameImages.forEach((image, index) => {
    image.src = currentHole.images[index]
    image.alt = `${currentHole.place} radar on ${currentHole.date} at ${currentHole.times[index]}`
  })
  document.querySelector("[data-intro-kicker]").textContent = `Hole ${currentHole.id} · ${currentHole.place}`
  document.querySelector("[data-intro-name]").textContent = currentHole.name
  document.querySelector("[data-intro-par]").textContent = currentHole.par
  document.querySelector("[data-intro-stamp]").textContent = `${currentHole.date} · ${timeWindow} · Par ${currentHole.par}`
  const introImage = document.querySelector("[data-intro-image]")
  introImage.src = currentHole.flyover
  introImage.alt = `${currentHole.name} regional Cleveland radar flyover`
  document.querySelector("[data-intro-copy]").textContent = currentHole.summary
  document.querySelector("[data-intro-challenges]").innerHTML = currentHole.challenges.map(challenge => `<li>${challenge}</li>`).join("")
  const skipIntro = new URLSearchParams(window.location.search).get("play") === "1"
  holeIntro.hidden = skipIntro
  document.body.classList.toggle("is-intro", !skipIntro)
  log.innerHTML = `<li>On the radar tee. Reveal ${currentHole.times[1]}, choose its moving target, then execute from ${currentHole.times[0]}.</li>`
  renderRoundCard()
}

function roundToPar(strokes, par) {
  const difference = strokes - par
  if (difference === 0) return "E"
  return difference > 0 ? `+${difference}` : `${difference}`
}

function renderRoundCard() {
  const round = readRound()
  const rows = ForeCastGame.holes.map(hole => {
    const result = round[hole.id]
    const active = hole.id === currentHole.id
    const status = result ? `<strong>${result.strokes} <small>${roundToPar(result.strokes, hole.par)}</small></strong><span>${result.points} pts</span>` : active ? `<strong>Playing</strong><span>Par ${hole.par}</span>` : `<strong>—</strong><span>Par ${hole.par}</span>`
    return `<li class="${active ? "is-current" : ""}${result ? " is-complete" : ""}"><a href="${holeUrl(hole.id)}"><i>${hole.id}</i><span><b>${hole.name}</b><small>${hole.date} · ${hole.times[0]}–${hole.times.at(-1)}</small></span>${status}</a></li>`
  })
  document.querySelector("[data-round-scorecard]").innerHTML = rows.join("")
  document.querySelector("[data-round-strip]").innerHTML = ForeCastGame.holes.map(hole => {
    const result = round[hole.id]
    return `<a class="${hole.id === currentHole.id ? "is-current" : ""}${result ? " is-complete" : ""}" href="${holeUrl(hole.id)}"><span>${hole.id}</span><strong>${hole.name}</strong><small>${result ? `${result.strokes} strokes` : `Par ${hole.par}`}</small></a>`
  }).join("")
  const results = ForeCastGame.holes.map(hole => round[hole.id]).filter(Boolean)
  const total = results.reduce((sum, result) => sum + result.strokes, 0)
  const par = ForeCastGame.holes.filter(hole => round[hole.id]).reduce((sum, hole) => sum + hole.par, 0)
  const points = results.reduce((sum, result) => sum + result.points, 0)
  document.querySelector("[data-round-total]").textContent = results.length ? `${total} · ${roundToPar(total, par)} · ${points} pts` : "—"
}

function recordHoleResult() {
  const round = readRound()
  round[currentHole.id] = { strokes: state.strokes, penalties: state.penalties, points: state.points, capped: state.capped }
  writeRound(round)
  renderRoundCard()
}

function centerBoard(point, behavior = "smooth") {
  if (!boardViewport.classList.contains("is-zoomed")) return
  const scale = board.clientWidth / ForeCastGame.width
  const desired = point.x * scale - boardViewport.clientWidth / 2
  boardViewport.scrollTo({ left: Math.max(0, Math.min(board.clientWidth - boardViewport.clientWidth, desired)), behavior })
}

function planningFocusPoint() {
  const nextFrame = Math.min(state.frame + 1, 3)
  const points = [state.ball, ...ForeCastGame.bonusesForFrame(nextFrame)]
  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  }
}

function renderBoardZoomControl() {
  const zoomed = boardViewport.classList.contains("is-zoomed")
  const label = zoomed ? "Zoom out to the whole hole" : "Zoom in to the shot window"
  boardZoomButton.setAttribute("aria-label", label)
  boardZoomButton.title = label
  boardZoomButton.querySelector("[data-zoom-symbol]").textContent = zoomed ? "−" : "+"
}

function startHole() {
  holeIntro.hidden = true
  document.body.classList.remove("is-intro")
  requestAnimationFrame(() => centerBoard(planningFocusPoint(), "auto"))
}

function svgPoint(event) {
  const rect = overlay.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * ForeCastGame.width,
    y: ((event.clientY - rect.top) / rect.height) * ForeCastGame.height
  }
}

function classifyPixel(r, g, b) {
  if (b > r + 45 && b > g + 14 && g > 65) return "earthWater"
  if (r > 175 && g > 55 && g < 235 && b < 105) return "storm"
  if (g > r * 1.24 && g > b * 1.12) return g >= 170 ? "light" : "dark"
  return "earthLand"
}

function readSurface(frame, point) {
  if (point.x < 14 || point.x > 964 || point.y < 14 || point.y > 476) return "out"
  const sampler = samplers[frame]
  if (!sampler) return "earthLand"
  const x = Math.round(point.x)
  const y = Math.round(point.y)
  const pixel = sampler.getImageData(x, y, 1, 1).data
  const center = classifyPixel(pixel[0], pixel[1], pixel[2])
  if (center !== "earthLand") return center

  const nearby = { light: 0, dark: 0 }
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) continue
      const neighbor = sampler.getImageData(x + offsetX, y + offsetY, 1, 1).data
      const surface = classifyPixel(neighbor[0], neighbor[1], neighbor[2])
      if (surface === "light" || surface === "dark") nearby[surface] += 1
    }
  }
  if (nearby.light + nearby.dark >= 5) return nearby.light >= nearby.dark ? "light" : "dark"
  return center
}

function verifySurfaceFairness() {
  const checks = [
    { label: "tee", frame: 0, point: ForeCastGame.tee },
    { label: "cup", frame: 3, point: ForeCastGame.cup },
    ...[1, 2, 3].flatMap(frame => ForeCastGame.bonusesForFrame(frame).map(target => ({ label: `${target.name} on frame ${frame + 1}`, frame, point: target })))
  ]
  const failures = checks.map(check => ({ ...check, surface: readSurface(check.frame, check.point) })).filter(check => ForeCastGame.surfaces[check.surface].penalty)
  if (failures.length) throw new Error(`${currentHole.name} geometry check failed: ${failures.map(check => `${check.label} is ${check.surface}`).join(", ")}`)
}

function buildIslandCatalog(frame) {
  const columns = Math.floor(ForeCastGame.width / islandGridStep)
  const rows = Math.floor(ForeCastGame.height / islandGridStep)
  const green = new Uint8Array(columns * rows)
  const visited = new Uint8Array(columns * rows)
  const indexFor = (column, row) => row * columns + column

  for (let row = 1; row < rows - 1; row += 1) {
    for (let column = 1; column < columns - 1; column += 1) {
      const surface = readSurface(frame, { x: column * islandGridStep + islandGridStep / 2, y: row * islandGridStep + islandGridStep / 2 })
      green[indexFor(column, row)] = surface === "light" || surface === "dark" ? 1 : 0
    }
  }

  const components = []
  for (let row = 1; row < rows - 1; row += 1) {
    for (let column = 1; column < columns - 1; column += 1) {
      const start = indexFor(column, row)
      if (!green[start] || visited[start]) continue
      const cells = []
      const queue = [start]
      visited[start] = 1
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor]
        cells.push(index)
        const cellColumn = index % columns
        const cellRow = Math.floor(index / columns)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const neighbor = indexFor(cellColumn + dx, cellRow + dy)
          if (green[neighbor] && !visited[neighbor]) {
            visited[neighbor] = 1
            queue.push(neighbor)
          }
        }
      }
      components.push(cells)
    }
  }

  components.sort((left, right) => right.length - left.length)
  const mainlandSize = components[0]?.length || 0
  return components.flatMap((cells, componentIndex) => {
    if (componentIndex === 0 || cells.length < 18 || cells.length > Math.min(900, mainlandSize * .18)) return []
    const members = new Set(cells)
    const boundaryQueue = []
    const depth = new Map()
    let minColumn = columns
    let maxColumn = 0
    let minRow = rows
    let maxRow = 0

    for (const index of cells) {
      const column = index % columns
      const row = Math.floor(index / columns)
      minColumn = Math.min(minColumn, column)
      maxColumn = Math.max(maxColumn, column)
      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
      const boundary = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !members.has(indexFor(column + dx, row + dy)))
      if (boundary) {
        depth.set(index, 0)
        boundaryQueue.push(index)
      }
    }

    let safest = cells[0]
    for (let cursor = 0; cursor < boundaryQueue.length; cursor += 1) {
      const index = boundaryQueue[cursor]
      const column = index % columns
      const row = Math.floor(index / columns)
      if ((depth.get(index) || 0) > (depth.get(safest) || 0)) safest = index
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighbor = indexFor(column + dx, row + dy)
        if (members.has(neighbor) && !depth.has(neighbor)) {
          depth.set(neighbor, (depth.get(index) || 0) + 1)
          boundaryQueue.push(neighbor)
        }
      }
    }

    const clearance = ((depth.get(safest) || 0) + 1) * islandGridStep
    if (clearance < 12 || minColumn <= 2 || minRow <= 2 || maxColumn >= columns - 3 || maxRow >= rows - 3) return []
    const area = cells.length * islandGridStep ** 2
    const diameter = Math.round(2 * Math.sqrt(area / Math.PI))
    const value = diameter <= 40 ? 10 : diameter <= 60 ? 8 : diameter <= 85 ? 6 : 4
    const safestColumn = safest % columns
    const safestRow = Math.floor(safest / columns)
    const shapePath = cells.map(index => {
      const column = index % columns
      const row = Math.floor(index / columns)
      return `M${column * islandGridStep} ${row * islandGridStep}h${islandGridStep}v${islandGridStep}h-${islandGridStep}Z`
    }).join("")
    return [{
      id: `${frame}-island-${componentIndex}`,
      kind: "island",
      name: "Radar Island",
      frame,
      value,
      color: "#ffad55",
      x: safestColumn * islandGridStep + islandGridStep / 2,
      y: safestRow * islandGridStep + islandGridStep / 2,
      r: Math.max(18, Math.min(32, clearance + 6)),
      diameter,
      shapePath,
      members,
      columns
    }]
  })
}

function maxReach(state) {
  const lie = ForeCastGame.lieEffects[state.lie] || ForeCastGame.lieEffects["Light green"]
  return Math.max(...Object.values(ForeCastGame.clubs).map(club => club.reach * lie.reach))
}

function availableBonusesForFrame(frame, fromState = state) {
  const reach = maxReach(fromState)
  const ballToCup = ForeCastGame.distance(fromState.ball, ForeCastGame.cup)
  const authored = ForeCastGame.bonusesForFrame(frame).map(item => ({ ...item, kind: "authored" }))
  return [...authored, ...(islandCatalogs[frame] || [])].filter(item => {
    if (ForeCastGame.distance(fromState.ball, item) > reach) return false
    if (item.kind !== "island") return true
    if (ForeCastGame.distance(item, ForeCastGame.cup) >= ballToCup) return false
    return !containsBonus(item, fromState.ball)
  })
}

function containsBonus(item, point) {
  if (item.kind !== "island") return ForeCastGame.distance(point, item) <= item.r
  const column = Math.floor(point.x / islandGridStep)
  const row = Math.floor(point.y / islandGridStep)
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (item.members.has((row + dy) * item.columns + column + dx)) return true
    }
  }
  return false
}

function prepareRadarSamplers() {
  return Promise.all(frameImages.map((image, index) => new Promise(resolve => {
    const ready = () => {
      const canvas = document.createElement("canvas")
      canvas.width = ForeCastGame.width
      canvas.height = ForeCastGame.height
      const context = canvas.getContext("2d", { willReadFrequently: true })
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      samplers[index] = context
      resolve()
    }
    image.decode().then(ready).catch(() => {
      if (image.complete && image.naturalWidth) ready()
      else image.addEventListener("load", ready, { once: true })
    })
  }))).then(() => {
    verifySurfaceFairness()
    for (let frame = 1; frame < frameImages.length; frame += 1) islandCatalogs[frame] = buildIslandCatalog(frame)
    render()
  })
}

function addLog(message) {
  log.insertAdjacentHTML("afterbegin", `<li>${message}</li>`)
}

function surfaceMarkup(surface) {
  const detail = ForeCastGame.surfaces[surface]
  return `<span class="surface-chip surface-chip--${surface}">${detail.label}</span>`
}

function renderRoutes() {
  if (state.view !== "next") {
    routeLayer.replaceChildren()
    return
  }
  const targets = availableBonusesForFrame(Math.min(state.frame + 1, 3)).filter(item => item.kind === "authored")
  routeLayer.innerHTML = targets.map(item =>
    `<path class="course-route${item.route === state.route ? " is-selected" : ""}" d="M${state.ball.x} ${state.ball.y} Q${(state.ball.x + item.x) / 2} ${Math.min(state.ball.y, item.y) - 34} ${item.x} ${item.y}" style="color:${item.color}" marker-end="url(#route-arrow)"/>`
  ).join("")
}

function bonusStatus(item, frame) {
  if (state.collected.includes(item.id)) return { label: "Banked", className: "banked" }
  if (item.kind === "island") {
    const size = item.diameter <= 40 ? "Tiny" : item.diameter <= 60 ? "Small" : item.diameter <= 85 ? "Medium" : "Large"
    return { label: `${size} island`, className: "island" }
  }
  const surface = readSurface(frame, item)
  if (ForeCastGame.surfaces[surface].penalty) return { label: ForeCastGame.surfaces[surface].label, className: "danger" }
  return { label: ForeCastGame.surfaces[surface].label, className: surface }
}

function bonusMarkup(item) {
  if (item.kind === "island") {
    return `<g class="bonus-ring bonus-ring--island" style="color:${item.color}" aria-label="${item.name}, ${item.value} points">
      <path class="island-shape" d="${item.shapePath}"/>
      <circle class="island-landing" cx="${item.x}" cy="${item.y}" r="${item.r}"/>
      <text class="island-value" x="${item.x}" y="${item.y + 7}" text-anchor="middle">+${item.value}</text>
      <text class="island-label" x="${item.x}" y="${item.y - item.r - 8}" text-anchor="middle">RADAR ISLAND</text>
    </g>`
  }
  return `<g class="bonus-ring" style="color:${item.color}" aria-label="${item.name}, ${item.value} points">
    <circle cx="${item.x}" cy="${item.y}" r="${item.r}"/>
    <text x="${item.x}" y="${item.y + 7}" text-anchor="middle">+${item.value}</text>
  </g>`
}

function bonusUmbrellaMarkup(outcome) {
  if (!outcome?.bonus) return ""
  const x = outcome.end.x
  const y = outcome.end.y
  const leanDirection = x <= ForeCastGame.cup.x ? -1 : 1
  const angle = leanDirection * 35
  const labelX = Math.max(32, Math.min(ForeCastGame.width - 32, x + leanDirection * 58))
  const labelY = Math.max(24, y - 46)
  return `<g class="bonus-umbrella-marker" aria-label="Bonus umbrella planted here for ${outcome.bonus.value} points">
    <g class="bonus-umbrella" transform="translate(${x} ${y}) rotate(${angle})">
      <path class="bonus-umbrella-shaft" d="M0 0V-41"/>
      <path class="bonus-umbrella-canopy" d="M-21 -39Q0 -64 21 -39Q14 -45 7 -39Q0 -45 -7 -39Q-14 -45 -21 -39Z"/>
      <path class="bonus-umbrella-panel" d="M-21 -39Q0 -64 0 -39Q-7 -45 -14 -39Q-18 -42 -21 -39Z"/>
      <path class="bonus-umbrella-ribs" d="M0 -62Q-9 -53 -14 -40M0 -62Q9 -53 14 -40M0 -62V-40"/>
      <circle class="bonus-umbrella-base" cx="0" cy="0" r="5"/>
    </g>
    <text x="${labelX}" y="${labelY}" text-anchor="middle">+${outcome.bonus.value}</text>
  </g>`
}

function renderBonuses() {
  const nextFrame = Math.min(state.frame + 1, 3)
  const nextBonuses = availableBonusesForFrame(nextFrame)
  const currentReceipt = state.view === "current" && state.lastOutcome
  const replaying = currentReceipt && state.phase === "replay"
  const earnedMarker = currentReceipt && !replaying ? bonusUmbrellaMarkup(state.lastOutcome) : ""
  if (state.view === "next") bonusLayer.innerHTML = nextBonuses.map(bonusMarkup).join("")
  else if (replaying) bonusLayer.innerHTML = state.lastOutcome.availableBonuses.map(bonusMarkup).join("")
  else bonusLayer.innerHTML = earnedMarker
  document.querySelector("[data-bonus-list]").innerHTML = nextBonuses.map(item => {
    const status = bonusStatus(item, nextFrame)
    return `<li><span class="target-key" style="color:${item.color}"><i class="target-dot"></i>${item.name} · +${item.value}</span><strong class="target-status target-status--${status.className}">${status.label}</strong></li>`
  }).join("")
  ForeCastGame.bonusesForFrame(nextFrame).forEach(item => {
    const qualified = nextBonuses.find(bonus => bonus.id === item.id)
    document.querySelectorAll(`[data-route="${item.route}"]`).forEach(card => {
      const detail = card.querySelector("small")
      if (detail) detail.textContent = `+${item.value} · ${ForeCastGame.surfaces[readSurface(nextFrame, item)].label}`
      card.disabled = state.phase !== "aim" || state.complete || !qualified
    })
  })
}

function renderAim() {
  const club = ForeCastGame.effectiveClub(state)
  const dx = state.aim.x - state.ball.x
  const dy = state.aim.y - state.ball.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const normalX = -dy / length
  const normalY = dx / length
  const spread = 18 * club.spread
  aimLine.setAttribute("x1", state.ball.x)
  aimLine.setAttribute("y1", state.ball.y)
  aimLine.setAttribute("x2", state.aim.x)
  aimLine.setAttribute("y2", state.aim.y)
  aimMarker.setAttribute("cx", state.aim.x)
  aimMarker.setAttribute("cy", state.aim.y)
  shotCone.setAttribute("d", `M${state.ball.x} ${state.ball.y} L${state.aim.x + normalX * spread} ${state.aim.y + normalY * spread} L${state.aim.x - normalX * spread} ${state.aim.y - normalY * spread} Z`)
  document.querySelector("[data-power-target]").style.left = `${ForeCastGame.powerTarget(state)}%`
  const nextSurface = readSurface(Math.min(state.frame + 1, 3), state.aim)
  document.querySelector("[data-aim-weather]").innerHTML = `AIM · NEXT FRAME: ${surfaceMarkup(nextSurface)}`
  document.querySelector("[data-preview-title]").textContent = `Next frame · ${ForeCastGame.surfaces[nextSurface].label}`
  document.querySelector("[data-preview-copy]").textContent = ForeCastGame.surfaces[nextSurface].copy
}

function renderMeters() {
  document.querySelector("[data-power-fill]").style.width = `${livePower}%`
  document.querySelector("[data-power-needle]").style.left = `${livePower}%`
  document.querySelector("[data-accuracy-needle]").style.left = `${liveAccuracy}%`
  document.querySelector("[data-power-readout]").textContent = state.power == null ? "—" : `${Math.round(state.power)}%`
  document.querySelector("[data-accuracy-readout]").textContent = state.accuracy == null ? "—" : `${Math.round(Math.abs(state.accuracy) * 100)} off`
}

function phaseCopy() {
  if (state.phase === "replay") return { button: "Replaying…", status: "Watching last stroke" }
  if (state.complete) return { button: "Hole complete", status: "Finished" }
  if (state.phase === "power") return { button: "Lock power", status: "Power moving" }
  if (state.phase === "accuracy") return { button: "Strike", status: "Accuracy moving" }
  return { button: `Start stroke ${state.strokes + 1}`, status: "Ready" }
}

function render() {
  const nextFrame = Math.min(state.frame + 1, 3)
  const shownFrame = state.view === "next" ? nextFrame : state.frame
  frameImages.forEach((image, index) => image.classList.toggle("is-current", index === shownFrame))
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("is-current", button.dataset.view === state.view))
  document.querySelector("[data-view-label]").textContent = `${state.view.toUpperCase()} · ${frameTimes[shownFrame].replace(" PM", "")}`
  document.querySelector("[data-current-clock]").textContent = `Current ${frameTimes[state.frame].replace(" PM", "")}`
  document.querySelector("[data-next-clock]").textContent = nextFrame === state.frame ? "Final frame" : `Next ${frameTimes[nextFrame].replace(" PM", "")}`
  document.querySelector("[data-current-button]").textContent = frameTimes[state.frame]
  document.querySelector("[data-next-button]").textContent = nextFrame === state.frame ? "Final frame" : frameTimes[nextFrame]
  document.querySelector("[data-to-par]").textContent = state.complete ? ForeCastGame.scoreToPar(state) : `S${state.strokes + 1}`
  document.querySelector("[data-strokes]").textContent = state.strokes
  document.querySelector("[data-points]").textContent = `${state.points} pts`
  document.querySelector("[data-penalties]").textContent = state.penalties
  document.querySelector("[data-lie]").textContent = state.lie
  document.querySelector("[data-mobile-stroke]").textContent = state.complete ? state.strokes : state.strokes + 1
  document.querySelector("[data-mobile-points]").textContent = state.points
  document.querySelector("[data-mobile-penalties]").textContent = state.penalties
  document.querySelector("[data-mobile-lie]").textContent = state.lie
  document.querySelector("[data-score-meta]").textContent = state.complete ? `Final · ${state.strokes} strokes · ${state.points} bonus points` : `Stroke ${state.strokes + 1} · ${state.lie} lie`
  const reviewing = Boolean(state.lastOutcome && state.reviewShot && state.view === "current")
  const replaying = state.phase === "replay"
  replayButton.disabled = !state.lastOutcome || replaying
  trails.toggleAttribute("hidden", !reviewing)
  document.querySelectorAll("[data-club]").forEach(button => {
    button.classList.toggle("is-selected", button.dataset.club === state.club)
    button.disabled = state.phase !== "aim" || state.complete
  })
  document.querySelectorAll("[data-route]").forEach(button => {
    button.classList.toggle("is-selected", button.dataset.route === state.route)
    button.disabled = state.phase !== "aim" || state.complete
  })
  const copy = phaseCopy()
  swingButton.textContent = copy.button
  swingButton.disabled = state.complete || replaying
  document.querySelector("[data-swing-status]").textContent = copy.status
  document.querySelector("[data-instruction]").textContent = replaying ? "Replaying the exact stored stroke. Score and position will not change." : state.phase === "aim" ? "Tap or click the board to choose the ball's intended landing point. Plan for roll after contact." : "Aim is locked until this stroke resolves."
  for (const element of [aimLine, aimMarker, shotCone]) element.toggleAttribute("hidden", replaying)
  ball.setAttribute("cx", state.ball.x)
  ball.setAttribute("cy", state.ball.y)
  ballLabel.setAttribute("x", state.ball.x)
  ballLabel.setAttribute("y", state.ball.y + 32)
  ballLabel.textContent = state.strokes === 0 ? "TEE" : state.lie === "Drop" ? "SAFE DROP" : "BALL"
  renderRoutes()
  renderBonuses()
  renderAim()
  renderMeters()
  const result = document.querySelector("[data-result]")
  result.hidden = !state.complete
  if (state.complete) {
    document.querySelector("[data-result-title]").textContent = state.capped ? "Stroke limit" : `${ForeCastGame.scoreToPar(state)} · ${state.points} bonus pts`
    document.querySelector("[data-result-copy]").textContent = state.capped ? `The hole is capped at ${ForeCastGame.strokeCap} strokes. Try a safer route or a cleaner meter.` : `Finished in ${state.strokes} strokes with ${state.penalties} penalties. Your route earned ${state.points} bonus points.`
    const nextButton = document.querySelector("[data-next-hole]")
    nextButton.textContent = currentHole.id < ForeCastGame.holes.length ? `Play hole ${currentHole.id + 1}` : "View round card"
  }
  renderRoundCard()
}

function meterValue(elapsed, speed = 1) {
  const cycle = (elapsed * speed / 1450) % 2
  return cycle <= 1 ? cycle * 100 : (2 - cycle) * 100
}

function animateMeter(now) {
  if (state.phase === "power") {
    livePower = meterValue(now - meterStartedAt, ForeCastGame.effectiveClub(state).meter)
  } else if (state.phase === "accuracy") {
    liveAccuracy = meterValue(now - meterStartedAt, ForeCastGame.effectiveClub(state).meter * 1.22)
  } else return
  renderMeters()
  meterFrame = requestAnimationFrame(animateMeter)
}

function startMeter(phase) {
  cancelAnimationFrame(meterFrame)
  state = { ...state, phase }
  meterStartedAt = performance.now()
  meterFrame = requestAnimationFrame(animateMeter)
  render()
}

function drawTrail(geometry) {
  const rollPoints = geometry.rollPath.map(point => `${point.x},${point.y}`).join(" ")
  trails.innerHTML = `<line class="flight-trail" x1="${geometry.start.x}" y1="${geometry.start.y}" x2="${geometry.landing.x}" y2="${geometry.landing.y}"/><polyline class="roll-trail" points="${rollPoints}"/>`
}

function drawImpact(geometry) {
  if (!geometry.hazard) return
  trails.insertAdjacentHTML("beforeend", `<g class="impact-marker"><circle cx="${geometry.rest.x}" cy="${geometry.rest.y}" r="18"/><text x="${geometry.rest.x}" y="${geometry.rest.y - 26}" text-anchor="middle">${geometry.hazard === "storm" ? "HAZARD HERE" : "FELL HERE"}</text></g>`)
}

function drawDrop(geometry) {
  if (!geometry.drop) return
  trails.insertAdjacentHTML("beforeend", `<line class="drop-trail" x1="${geometry.rest.x}" y1="${geometry.rest.y}" x2="${geometry.drop.x}" y2="${geometry.drop.y}"/><circle class="drop-marker" cx="${geometry.drop.x}" cy="${geometry.drop.y}" r="15"/>`)
}

function showHazardEffect(geometry) {
  const x = geometry.rest.x
  const y = geometry.rest.y
  const id = `effect-${performance.now().toString().replace(".", "-")}`
  if (geometry.hazard === "earthWater") {
    effects.insertAdjacentHTML("beforeend", `<g id="${id}" class="hazard-effect splash-effect"><ellipse cx="${x}" cy="${y}" rx="10" ry="4"/><ellipse cx="${x}" cy="${y}" rx="22" ry="8"/><path d="M${x - 18} ${y - 5}Q${x - 8} ${y - 30} ${x - 2} ${y - 4}M${x + 18} ${y - 5}Q${x + 8} ${y - 30} ${x + 2} ${y - 4}"/></g>`)
  } else if (geometry.hazard === "earthLand" || geometry.hazard === "out") {
    effects.insertAdjacentHTML("beforeend", `<g id="${id}" class="hazard-effect dust-effect"><circle cx="${x - 14}" cy="${y}" r="8"/><circle cx="${x}" cy="${y - 6}" r="11"/><circle cx="${x + 14}" cy="${y}" r="7"/><text x="${x}" y="${y - 25}" text-anchor="middle">FALL!</text></g>`)
  } else {
    effects.insertAdjacentHTML("beforeend", `<g id="${id}" class="hazard-effect storm-effect"><circle cx="${x}" cy="${y}" r="24"/><path d="M${x - 8} ${y - 30}L${x + 4} ${y - 8}H${x - 3}L${x + 9} ${y + 22}"/></g>`)
  }
  setTimeout(() => document.getElementById(id)?.remove(), 950)
}

function animatePenalty(geometry, restX, restY, done) {
  const fallsThrough = geometry.hazard === "earthLand" || geometry.hazard === "earthWater" || geometry.hazard === "out"
  if (!fallsThrough) {
    showHazardEffect(geometry)
    setTimeout(done, 420)
    return
  }
  const fall = ball.animate([
    { transform: `translate(${restX}px, ${restY}px) scale(1)`, opacity: 1 },
    { transform: `translate(${restX}px, ${restY + 12}px) scale(.58)`, opacity: .9, offset: .55 },
    { transform: `translate(${restX}px, ${restY + 22}px) scale(.08)`, opacity: 0 }
  ], { duration: 460, easing: "cubic-bezier(.4,0,.8,.35)", fill: "forwards" })
  fall.addEventListener("finish", () => {
    showHazardEffect(geometry)
    setTimeout(done, geometry.hazard === "earthWater" ? 620 : 430)
  }, { once: true })
}

function animateShot(geometry, done) {
  const flightX = geometry.landing.x - geometry.start.x
  const flightY = geometry.landing.y - geometry.start.y
  const restX = geometry.rest.x - geometry.start.x
  const restY = geometry.rest.y - geometry.start.y
  const flight = ball.animate([
    { transform: "translate(0 0) scale(1)" },
    { transform: `translate(${flightX * .55}px, ${flightY * .55 - 48}px) scale(.72)`, offset: .55 },
    { transform: `translate(${flightX}px, ${flightY}px) scale(.94)` }
  ], { duration: 620, easing: "cubic-bezier(.2,.72,.28,1)", fill: "forwards" })
  flight.addEventListener("finish", () => {
    if (geometry.rollDistance < .5) {
      if (geometry.hazard) animatePenalty(geometry, restX, restY, done)
      else done()
      return
    }
    const stride = Math.max(1, Math.ceil(geometry.rollPath.length / 36))
    const sampled = geometry.rollPath.filter((_, index) => index % stride === 0)
    const finalPoint = geometry.rollPath.at(-1)
    if (sampled.at(-1) !== finalPoint) sampled.push(finalPoint)
    const rollFrames = sampled.map(point => ({
      transform: `translate(${point.x - geometry.start.x}px, ${point.y - geometry.start.y}px) rotate(${point.distance * 18}deg) scale(1)`,
      offset: point.distance / geometry.rollDistance
    }))
    const roll = ball.animate(rollFrames, {
      duration: Math.max(320, Math.min(1450, 220 + geometry.rollDistance * 10)),
      easing: "linear",
      fill: "forwards"
    })
    roll.addEventListener("finish", () => {
      if (geometry.hazard) animatePenalty(geometry, restX, restY, done)
      else done()
    }, { once: true })
  }, { once: true })
}

function outcomeMessage(previous, next, geometry) {
  if (geometry.hazard) {
    const penalty = ForeCastGame.surfaces[geometry.hazard].penalty
    const rolledOff = geometry.rollExit && !ForeCastGame.surfaces[geometry.landingSurface].penalty
    const outcomes = {
      earthLand: rolledOff ? "rolled off the radar and fell to land" : "missed the radar and fell to land",
      earthWater: rolledOff ? "rolled off the radar and fell into water" : "missed the radar and fell into water",
      storm: rolledOff ? "rolled into a storm hazard" : "landed in a storm hazard",
      out: "left the playable map"
    }
    const dropDistance = Math.round(ForeCastGame.distance(geometry.rest, geometry.drop))
    return `Stroke ${previous.strokes + 1}: ${outcomes[geometry.hazard]}. +${penalty} penalty ${penalty === 1 ? "stroke" : "strokes"}; safe drop ${dropDistance} yd away on the new frame.`
  }
  const roll = Math.round(geometry.rollDistance)
  const bonus = geometry.bonus ? ` ${geometry.bonus.name} banked for +${geometry.bonus.value}.` : ""
  const cup = next.complete && !next.capped ? ` Holed out in ${next.strokes}.` : ""
  return `Stroke ${next.strokes}: landed in ${ForeCastGame.surfaces[geometry.landingSurface].label.toLowerCase()} and rolled ${roll} yd to ${ForeCastGame.surfaces[geometry.restSurface].label.toLowerCase()}.${bonus}${cup}`
}

function strike() {
  cancelAnimationFrame(meterFrame)
  const accuracy = (liveAccuracy - 50) / 50
  state = { ...state, accuracy }
  const previous = state
  const destinationFrame = Math.min(state.frame + 1, 3)
  const availableBonuses = availableBonusesForFrame(destinationFrame, state)
  const resolved = ForeCastGame.resolveShot(state, state.power, accuracy, readSurface, availableBonuses, containsBonus)
  trails.replaceChildren()
  effects.replaceChildren()
  trails.removeAttribute("hidden")
  drawTrail(resolved.geometry)
  shotToast.hidden = true
  swingButton.disabled = true
  playSwingSound()
  animateShot(resolved.geometry, () => {
    ball.getAnimations().forEach(animation => animation.cancel())
    state = resolved.state
    if (state.complete) recordHoleResult()
    livePower = 0
    liveAccuracy = 50
    const message = outcomeMessage(previous, state, resolved.geometry)
    addLog(message)
    shotToast.textContent = message
    shotToast.hidden = false
    if (!state.complete) state = { ...state, aim: ForeCastGame.clampAim(state, ForeCastGame.cup) }
    render()
    drawImpact(resolved.geometry)
    drawDrop(resolved.geometry)
    if (resolved.geometry.bonus) playGolfClap()
    centerBoard(planningFocusPoint())
  })
}

function replayLastShot() {
  if (!state.lastOutcome || state.phase !== "aim") return
  const geometry = state.lastOutcome
  ball.getAnimations().forEach(animation => animation.cancel())
  trails.replaceChildren()
  effects.replaceChildren()
  state = { ...state, view: "current", reviewShot: true, phase: "replay" }
  render()
  ball.setAttribute("cx", geometry.start.x)
  ball.setAttribute("cy", geometry.start.y)
  ballLabel.setAttribute("x", geometry.start.x)
  ballLabel.setAttribute("y", geometry.start.y + 32)
  ballLabel.textContent = "REPLAY"
  drawTrail(geometry)
  playSwingSound()
  animateShot(geometry, () => {
    ball.getAnimations().forEach(animation => animation.cancel())
    state = { ...state, phase: "aim", reviewShot: false }
    render()
    drawImpact(geometry)
    drawDrop(geometry)
    if (geometry.bonus) playGolfClap()
  })
}

function swing() {
  if (state.complete) return
  if (state.phase === "aim") {
    shotToast.hidden = true
    state = { ...state, view: "current", power: null, accuracy: null }
    livePower = 0
    liveAccuracy = 50
    startMeter("power")
  } else if (state.phase === "power") {
    cancelAnimationFrame(meterFrame)
    state = { ...state, power: livePower }
    startMeter("accuracy")
  } else if (state.phase === "accuracy") {
    strike()
  }
}

function reset(clearResult = false) {
  cancelAnimationFrame(meterFrame)
  if (clearResult) {
    const round = readRound()
    delete round[currentHole.id]
    writeRound(round)
  }
  state = ForeCastGame.initialState()
  livePower = 0
  liveAccuracy = 50
  trails.replaceChildren()
  effects.replaceChildren()
  shotToast.hidden = true
  log.innerHTML = `<li>On the radar tee. Reveal ${frameTimes[1]}, choose its moving target, then execute from ${frameTimes[0]}.</li>`
  render()
}

board.addEventListener("pointerdown", event => {
  if (event.target.closest(".board-status") || state.phase !== "aim" || state.complete) return
  state = ForeCastGame.aim(state, svgPoint(event))
  render()
})
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  if (state.phase !== "aim" || state.complete) return
  state = { ...state, view: button.dataset.view }
  render()
  requestAnimationFrame(() => centerBoard(planningFocusPoint()))
}))
replayButton.addEventListener("click", replayLastShot)
document.querySelectorAll("[data-club]").forEach(button => button.addEventListener("click", () => {
  state = ForeCastGame.selectClub(state, button.dataset.club)
  render()
}))
document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => {
  state = ForeCastGame.selectRoute(state, button.dataset.route)
  state = { ...state, view: "next" }
  render()
  centerBoard(planningFocusPoint())
}))
boardZoomButton.addEventListener("click", () => {
  boardViewport.classList.toggle("is-zoomed")
  renderBoardZoomControl()
  requestAnimationFrame(() => centerBoard(planningFocusPoint(), "auto"))
})
startHoleButton.addEventListener("click", startHole)
swingButton.addEventListener("click", swing)
document.querySelector("[data-reset]").addEventListener("click", () => reset(true))
document.querySelector("[data-play-again]").addEventListener("click", () => reset(true))
document.querySelector("[data-next-hole]").addEventListener("click", () => {
  if (currentHole.id < ForeCastGame.holes.length) window.location.href = holeUrl(currentHole.id + 1)
  else document.querySelector("[data-round-scorecard]").scrollIntoView({ behavior: "smooth", block: "center" })
})
document.querySelector("[data-new-round]").addEventListener("click", () => {
  writeRound({})
  window.location.href = holeUrl(1)
})
configureHole()
prepareRadarSamplers()
renderBoardZoomControl()
render()
if (holeIntro.hidden) requestAnimationFrame(() => centerBoard(planningFocusPoint(), "auto"))

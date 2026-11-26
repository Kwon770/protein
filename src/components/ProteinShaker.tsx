import { useId, useLayoutEffect, useRef } from 'react'
import shakerUrl from '../assets/images/protein-shaker-empty.png'
import './protein-shaker.css'

const fullLevel = 433
const emptyLevel = 1280
const ballRestX = 266
const ballRestY = 1172
const leftWall = 62
const rightWall = 514
const surfaceWidth = rightWall - leftWall
const leftControl = leftWall + surfaceWidth / 3
const rightControl = rightWall - surfaceWidth / 3

// The bottle interior tapers toward its rounded base.
const bottleInterior =
  'M 72 416 Q 290 432 502 416 L 480 1227 Q 479 1254 466 1266 Q 287 1290 105 1266 Q 93 1261 91 1232 Z'

const wireLoops =
  'M -91 0 A 91 96 0 1 0 91 0 A 91 96 0 1 0 -91 0 ' +
  'M -90 -9 C -79 -56 76 -64 90 -12 C 102 34 -86 51 -90 -9 Z ' +
  'M -67 -64 C -39 -95 62 -94 76 -52 C 85 -21 -89 -15 -67 -64 Z ' +
  'M -73 57 C -96 24 86 5 81 47 C 77 80 -37 95 -73 57 Z ' +
  'M -19 -94 C 63 -103 59 97 10 95 C -46 91 -72 -47 -19 -94 Z'

type ShakerFrame = {
  level: number
  tilt: number
  ripple: number
  ballDrift: number
  ballRotation: number
  ballLift: number
}

function restingFrame(level: number): ShakerFrame {
  return { level, tilt: 0, ripple: 0, ballDrift: 0, ballRotation: 0, ballLift: 0 }
}

function frameGeometry({ level, tilt, ripple, ballDrift, ballRotation, ballLift }: ShakerFrame) {
  const depth = 23 * Math.min(1, Math.max(0, (emptyLevel - level) / 42))
  const leftY = level - tilt
  const rightY = level + tilt
  const firstY = leftY + depth + ripple
  const secondY = rightY + depth - ripple
  const front = `M ${leftWall} ${leftY} C ${leftControl} ${firstY} ${rightControl} ${secondY} ${rightWall} ${rightY}`
  const back = `C ${rightControl} ${rightY - depth - ripple} ${leftControl} ${leftY - depth + ripple} ${leftWall} ${leftY}`

  const ballX = Math.max(203, Math.min(377, ballRestX + ballDrift))
  const t = (ballX - leftWall) / surfaceWidth
  const u = 1 - t
  const surfaceY = u ** 3 * leftY + 3 * u ** 2 * t * firstY + 3 * u * t ** 2 * secondY + t ** 3 * rightY
  const ballY = Math.max(fullLevel + 61, Math.min(ballRestY, surfaceY + 8 - ballLift))
  const hasLiquid = level < emptyLevel

  return {
    body: hasLiquid ? `${front} V 1300 H ${leftWall} Z` : '',
    surface: hasLiquid ? `${front} ${back} Z` : '',
    ball: `translate(${ballX} ${ballY}) rotate(${ballRotation})`,
  }
}

export function ProteinShaker({ value, max }: { value: number; max: number }) {
  const goal = Math.max(1, max)
  const consumed = Math.max(0, value)
  const fill = Math.min(consumed / goal, 1)
  const level = emptyLevel - fill * (emptyLevel - fullLevel)
  const id = useId()
  const surfaceRef = useRef<SVGPathElement>(null)
  const milkRef = useRef<SVGPathElement>(null)
  const ballRef = useRef<SVGGElement>(null)
  const currentFrame = useRef(restingFrame(level))
  const previousIntake = useRef(consumed)
  const initial = frameGeometry(restingFrame(level))

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    const milk = milkRef.current
    const ball = ballRef.current
    const start = currentFrame.current
    const target = restingFrame(level)
    const added = consumed > previousIntake.current
    previousIntake.current = consumed
    if (!surface || !milk || !ball) return

    const render = (frame: ShakerFrame) => {
      const geometry = frameGeometry(frame)
      surface.setAttribute('d', geometry.surface)
      milk.setAttribute('d', geometry.body)
      ball.setAttribute('transform', geometry.ball)
      currentFrame.current = frame
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const slosh = added && level < start.level
    if (reducedMotion.matches || (!slosh && start.level === level && start.tilt === 0)) {
      render(target)
      return
    }

    const duration = slosh ? 1120 : 280
    const strength = slosh ? Math.min(100, 66 + (start.level - level) * 0.25) : 0
    const startedAt = performance.now()
    let animationFrame: number

    const animate = (now: number) => {
      const time = Math.max(0, Math.min(1, (now - startedAt) / duration))
      if (time === 1 || reducedMotion.matches) {
        render(target)
        return
      }

      const rise = 1 - (1 - Math.min(1, time * (slosh ? 2.5 : 1))) ** 3
      const decay = (1 - time) ** 1.45
      const phase = time * Math.PI * 4.25
      const wave = strength * decay
      render({
        level: start.level + (level - start.level) * rise,
        tilt: start.tilt * decay + wave * Math.sin(phase),
        ripple: start.ripple * decay + wave * 0.58 * Math.sin(phase * 1.2),
        ballDrift: start.ballDrift * decay + wave * 1.25 * Math.sin(phase * 0.84),
        ballRotation: start.ballRotation * decay + wave * 0.64 * Math.sin(phase * 0.92),
        ballLift: start.ballLift * decay + wave * 0.42 * Math.sin(phase * 1.1),
      })
      animationFrame = requestAnimationFrame(animate)
    }

    render(start)
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [consumed, level])

  return (
    <div
      className="protein-shaker"
      role="progressbar"
      aria-label="오늘 단백질 섭취 진행률"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(consumed, goal)}
      aria-valuetext={`섭취 ${consumed}g, 목표 ${goal}g, ${Math.floor((consumed / goal) * 100)}%`}
    >
      <img
        src={shakerUrl}
        className="protein-shaker__image"
        width={423}
        height={1000}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <svg className="protein-shaker__contents" viewBox="0 0 580 1370" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-bottle`}>
            <path d={bottleInterior} />
          </clipPath>
          <clipPath id={`${id}-milk`}>
            <path ref={milkRef} d={initial.body} />
          </clipPath>
          <linearGradient id={`${id}-cocoa`}>
            <stop stopColor="#9c654b" />
            <stop offset=".16" stopColor="#c48b6f" />
            <stop offset=".53" stopColor="#a76d52" />
            <stop offset=".88" stopColor="#74452f" />
            <stop offset="1" stopColor="#583223" />
          </linearGradient>
          <linearGradient id={`${id}-surface`}>
            <stop stopColor="#ba8366" />
            <stop offset=".38" stopColor="#d3a086" />
            <stop offset="1" stopColor="#a46d52" />
          </linearGradient>
          <linearGradient id={`${id}-wire`} x2=".85" y2="1">
            <stop stopColor="#f4eee8" />
            <stop offset=".22" stopColor="#d1c6bc" />
            <stop offset=".58" stopColor="#746d69" />
            <stop offset=".81" stopColor="#c0b3a8" />
            <stop offset="1" stopColor="#514641" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-bottle)`}>
          <path
            ref={surfaceRef}
            d={initial.surface}
            fill={`url(#${id}-surface)`}
            stroke="#e2b399"
            strokeWidth="3"
          />
          <g ref={ballRef} transform={initial.ball}>
            <g className={fill >= 0.16 && fill < 0.99 ? 'protein-shaker__ball-float' : undefined}>
              <g transform="rotate(-21)" fill="none" strokeLinejoin="round">
                <path d={wireLoops} stroke="#352d29" strokeWidth="19" />
                <path d={wireLoops} stroke={`url(#${id}-wire)`} strokeWidth="12" />
              </g>
            </g>
          </g>
          <g clipPath={`url(#${id}-milk)`} className="protein-shaker__milk">
            <rect width="580" height="1370" fill={`url(#${id}-cocoa)`} />
            <image className="protein-shaker__reflection" href={shakerUrl} width="580" height="1370" />
          </g>
        </g>
      </svg>
    </div>
  )
}

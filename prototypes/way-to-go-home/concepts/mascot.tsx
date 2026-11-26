import type { CSSProperties } from 'react'
import catPhoto from '../assets/cat-collage.png'
import { formatGrams as grams, quickFoods, type Food, type HomeProps } from '../model'
import { Icon } from '../ui'
import './mascot.css'

function getMood({ total, percent, remaining }: HomeProps) {
  if (remaining === 0) return 'done'
  if (total === 0) return 'asleep'
  if (percent >= 80) return 'close'
  return 'active'
}

function Remaining({ value }: { value: number }) {
  return value === 0 ? (
    <span>오늘 목표 달성!</span>
  ) : (
    <span>
      <strong>{grams(value)} g</strong> 남음
    </span>
  )
}

function MastLog({ entries, onEdit }: Pick<HomeProps, 'entries' | 'onEdit'>) {
  return (
    <section className="mh-log" aria-label="오늘 기록">
      <h3>
        오늘 기록 <span>{entries.length}건</span>
      </h3>
      {entries.length === 0 ? (
        <p>첫 기록을 기다리고 있어요.</p>
      ) : (
        <ul>
          {[...entries].reverse().map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onEdit(entry)}
                aria-label={`${entry.name} 기록 수정`}
              >
                <span className="mh-log-icon">
                  <Icon name={entry.icon} size={16} />
                </span>
                <span>
                  <b>{entry.name}</b>
                  <small>
                    {entry.time}
                    {entry.estimated ? ' · 추정' : ''}
                  </small>
                </span>
                <strong>{grams(entry.grams)} g</strong>
                <Icon name="chevron-right" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InkCat({ mood }: { mood: ReturnType<typeof getMood> }) {
  return (
    <div className="mh-ink-cat" data-mood={mood} aria-hidden="true">
      <i className="mh-cat-tail" />
      <i className="mh-cat-body" />
      <i className="mh-cat-arm mh-cat-arm-left" />
      <i className="mh-cat-arm mh-cat-arm-right" />
      <i className="mh-cat-ear mh-cat-ear-left" />
      <i className="mh-cat-ear mh-cat-ear-right" />
      <div className="mh-cat-face">
        <i className="mh-cat-eye mh-cat-eye-left" />
        <i className="mh-cat-eye mh-cat-eye-right" />
        <i className="mh-cat-mouth" />
        <i className="mh-cat-whiskers mh-cat-whiskers-left" />
        <i className="mh-cat-whiskers mh-cat-whiskers-right" />
      </div>
      <i className="mh-cat-foot mh-cat-foot-left" />
      <i className="mh-cat-foot mh-cat-foot-right" />
    </div>
  )
}

const doodleLines = {
  asleep: '첫 기록 오면 깨워줘…',
  active: '앞발에 조금 힘이 들어간다.',
  close: '이 기세면 아주 쪼끔 남았다냥.',
  done: '오늘은 내가 헬스장 관장이다.',
}

export function DoodleHome(props: HomeProps) {
  const mood = getMood(props)
  return (
    <div className="mascot-home mh-doodle">
      <header className="md-header">
        <span className="md-logo" aria-hidden="true">
          <Icon name="dumbbell" size={19} />
        </span>
        <h2>낙서네 헬스장</h2>
      </header>
      <section className="md-hero" aria-label="오늘 기록한 단백질">
        <div className="md-stat">
          <p>오늘 기록한 단백질</p>
          <div className="md-total">
            {grams(props.total)}
            <small>g</small>
          </div>
          <div className="md-target">목표 {grams(props.target)} g</div>
          <div className="md-stroke" aria-hidden="true" />
        </div>
        <div className="md-figure">
          <span className="md-spark md-spark-large" aria-hidden="true">
            ✦
          </span>
          <span className="md-spark md-spark-small" aria-hidden="true">
            ✧
          </span>
          <InkCat mood={mood} />
        </div>
        <p className="md-bubble">{doodleLines[mood]}</p>
      </section>
      <div className="md-progress">
        <progress value={props.percent} max={100} aria-label="오늘 목표 진행률" />
        <Remaining value={props.remaining} />
      </div>
      <div className="md-actions">
        <button type="button" className="md-add" onClick={() => props.onAdd()}>
          <Icon name="plus" size={19} /> 음식 기록
        </button>
        {mood === 'done' && (
          <button type="button" className="md-share" onClick={props.onShare}>
            달성 카드
          </button>
        )}
      </div>
      <MastLog entries={props.entries} onEdit={props.onEdit} />
    </div>
  )
}

const fridgeLines = {
  asleep: '냉장고 앞에서 첫 기록을 기다리는 중.',
  active: '분명 여기 뭐가 더 있었는데.',
  close: '잠깐. 우리 거의 다 왔어.',
  done: '냉장고 앞 임시 영업 종료.',
}

const magnetLabels: Partial<Record<Food['icon'], string>> = {
  shake: '프로틴',
  egg: '달걀',
  yogurt: '요거트',
  chicken: '닭가슴살',
  tofu: '두부',
}

export function PhotoHome(props: HomeProps) {
  const mood = getMood(props)
  return (
    <div className="mascot-home mh-fridge">
      <header className="mf-header">
        <h2>밈 냉장고</h2>
        <div className="mf-vent" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </header>
      <div className="mf-door">
        <div className="mf-handle" aria-hidden="true" />
        <section className="mf-collage" aria-label="오늘 기록한 단백질">
          <div className="mf-paper">
            <span>오늘 기록한 단백질</span>
            <strong>
              {grams(props.total)}
              <small>g</small>
            </strong>
            <span>목표 {grams(props.target)} g</span>
          </div>
          <div className="mf-cutout" key={mood} data-mood={mood}>
            <img src={catPhoto} alt="냉장고를 지키는 고양이" />
            {mood === 'asleep' && <span aria-hidden="true">zZ</span>}
            {mood === 'close' && <span aria-hidden="true">!</span>}
            {mood === 'done' && <span aria-hidden="true">✦</span>}
          </div>
          <div className="mf-tape">
            <Remaining value={props.remaining} />
          </div>
          <p className="mf-caption">{fridgeLines[mood]}</p>
        </section>
        <section className="mf-shortcuts" aria-label="빠른 기록">
          <h3>자주 꺼내는 것</h3>
          <div className="mf-magnets">
            {quickFoods.slice(0, 3).map((food) => (
              <button
                type="button"
                key={food.name}
                onClick={() => props.onQuick(food)}
                aria-label={`${food.name} ${food.grams} g 추가`}
              >
                <Icon name={food.icon} size={22} />
                <b>{magnetLabels[food.icon] ?? food.name}</b>
                <small>+{grams(food.grams)} g</small>
              </button>
            ))}
          </div>
        </section>
        <div className="mf-actions">
          <button type="button" onClick={() => props.onAdd()}>
            <Icon name="plus" size={18} /> 음식 기록
          </button>
          {mood === 'done' && (
            <button type="button" onClick={props.onShare}>
              달성 카드
            </button>
          )}
        </div>
      </div>
      <MastLog entries={props.entries} onEdit={props.onEdit} />
    </div>
  )
}

const stickerLines = {
  asleep: '첫 입금액은 얼마가 될까요?',
  active: '어쨌든 한 번 더 기록했다!',
  close: '한 번만 더 챙기면 찰 것 같아.',
  done: '오늘의 근육 적금 완료!',
}
const weeklyExample = [true, true, false, true, false, true]

export function StickerHome(props: HomeProps) {
  const mood = getMood(props)
  return (
    <div className="mascot-home mh-sticker">
      <header className="ms-header">
        <span className="ms-mark" aria-hidden="true">
          ✿
        </span>
        <h2>근육 적금</h2>
      </header>
      <section className="ms-ticket" aria-label="오늘 기록한 단백질">
        <div className="ms-ticket-content">
          <p>오늘 기록한 단백질</p>
          <div className="ms-total">
            {grams(props.total)}
            <small>g</small>
          </div>
          <span className="ms-target">목표 {grams(props.target)} g</span>
          <div className="ms-stamp" aria-hidden="true">
            <InkCat mood={mood} />
          </div>
          <progress value={props.percent} max={100} aria-label="오늘 목표 진행률" />
          <div className="ms-ticket-bottom">
            <Remaining value={props.remaining} />
            <span>✦</span>
          </div>
        </div>
      </section>
      <p className="ms-message">{stickerLines[mood]}</p>
      <section className="ms-week" aria-label="주간 달성 예시">
        <div>
          <h3>최근 7일 도장</h3>
          <span>예시 기록</span>
        </div>
        <ol>
          {[...weeklyExample, mood === 'done'].map((done, index) => (
            <li key={index} className={index === 6 ? 'ms-today' : undefined}>
              <span
                className={done ? 'ms-week-done' : ''}
                role="img"
                aria-label={done ? '목표 달성' : index === 6 ? '오늘 진행 중' : '달성 도장 없음'}
              >
                {done ? '✿' : '·'}
              </span>
              <small>{index === 6 ? '오늘' : `${6 - index}일 전`}</small>
            </li>
          ))}
        </ol>
      </section>
      <div className="ms-actions">
        <button type="button" onClick={() => props.onAdd()}>
          <Icon name="plus" size={18} /> 단백질 기록
        </button>
        {mood === 'done' && (
          <button type="button" onClick={props.onShare}>
            달성 카드
          </button>
        )}
      </div>
      <MastLog entries={props.entries} onEdit={props.onEdit} />
    </div>
  )
}

const pixelArt = {
  asleep: [
    '................',
    '..X.........X...',
    '..XX.......XX...',
    '..XOXXXXXXXOX...',
    '..XOOOOOOOOOX...',
    '..XOOOOOOOOOX...',
    '..XOXXOOOXXOX...',
    '..XOOOOOOOOOX...',
    '...XXOOXOOXX....',
    '..XXOXXXXXOXX...',
    '..XOOOOOOOOOX...',
    '.XXOOXXXXOOXX.X.',
    '.XXXXXXXXXXXXXX.',
  ],
  active: [
    '................',
    '....X.....X.....',
    '...XXX...XXX....',
    '...XOOXXXOOX....',
    '...XOOOOOOOX....',
    '...XOXOOOXOX....',
    '...XOOOXOOOX....',
    '....XXOOOXX.....',
    '...XXXOOOXXX....',
    '...XOOOOOOOX..X.',
    '...XOOXXXOOX..X.',
    '...XOXX.XXOX.XX.',
    '...XXX...XXXXX..',
  ],
  close: [
    '.............X..',
    '....X.....X.XOX.',
    '...XXX...XXX.X..',
    '...XOOXXXOOX....',
    '...XOOOOOOOX....',
    '...XOXOOOXOX....',
    '.XX.XOOXOOX.XX..',
    'XOOXXXOOOXXXOOX.',
    'XOXOOOOOOOOOXOX.',
    'XX.XOOOOOOOX.XX.',
    '...XOOXXXOOX....',
    '...XOXX.XXOX.XX.',
    '...XXX...XXXXX..',
  ],
  done: [
    '.X...........X..',
    'XOX.X.....X.XOX.',
    '.X.XXX...XXX.X..',
    '...XOOXXXOOX....',
    '...XOOOOOOOX....',
    '.XXXOXOOOXOXXX..',
    'XOOXXOOXOOXXOOX.',
    'XOOOOXOOOXOOOOX.',
    'XXOOOOOOOOOOOXX.',
    '.XXXOOOOOOOXXX..',
    '...XOOXXXOOX....',
    '...XOXX.XXOX.XX.',
    '...XXX...XXXXX..',
  ],
}

const questLines = {
  asleep: '첫 기록으로 근육냥을 깨워요.',
  active: '근육냥이 기운을 되찾는 중!',
  close: '목표까지 거의 다 왔어요.',
  done: '미션 완료 · 근육냥 등장!',
}

function PixelCat({ mood }: { mood: ReturnType<typeof getMood> }) {
  const pixels = pixelArt[mood].flatMap((row, y) =>
    Array.from(row).flatMap((color, x) => {
      if (color === '.') return []
      return [<i key={`${x}-${y}`} data-shade={color} style={{ gridArea: `${y + 1} / ${x + 1}` }} />]
    }),
  )
  return (
    <div className="mq-cat" aria-hidden="true">
      {pixels}
    </div>
  )
}

export function QuestHome(props: HomeProps) {
  const mood = getMood(props)
  const level = ['asleep', 'active', 'close', 'done'].indexOf(mood) + 1
  return (
    <div className="mascot-home mh-quest">
      <header className="mq-header">
        <span className="mq-light" aria-hidden="true" />
        <h2>근육냥 퀘스트</h2>
      </header>
      <section className="mq-console" aria-label="오늘의 단백질 미션">
        <div className="mq-screen">
          <div className="mq-screen-head">
            <span>오늘 기록한 단백질</span>
            <span>LV. {level}</span>
          </div>
          <div className="mq-playfield">
            <div className="mq-count">
              <strong>
                {grams(props.total)}
                <small>g</small>
              </strong>
              <span>목표 {grams(props.target)} g</span>
            </div>
            <PixelCat mood={mood} />
          </div>
          <div
            className="mq-gauge"
            role="progressbar"
            aria-label="오늘 목표 진행률"
            aria-valuenow={props.percent}
          >
            <div style={{ '--quest-percent': `${props.percent}%` } as CSSProperties} />
          </div>
          <div className="mq-screen-foot">
            <Remaining value={props.remaining} />
            <span>{props.percent}%</span>
          </div>
        </div>
        <p className="mq-prompt">{questLines[mood]}</p>
        <div className="mq-controls">
          <button type="button" onClick={() => props.onAdd()}>
            <Icon name="plus" size={19} /> 음식 기록
          </button>
          <button type="button" onClick={() => props.onAdd('estimate')}>
            끼니 추정
          </button>
        </div>
        {mood === 'done' && (
          <button type="button" className="mq-share" onClick={props.onShare}>
            달성 카드
          </button>
        )}
      </section>
      <MastLog entries={props.entries} onEdit={props.onEdit} />
    </div>
  )
}

const comicLines = {
  asleep: '아직은 준비 운동 중…',
  active: '조금은 든든해졌다.',
  close: '앞발이 제법 묵직해졌다.',
  done: '오늘. 정말로. 근육냥.',
}

export function ComicHome(props: HomeProps) {
  const mood = getMood(props)
  return (
    <div className="mascot-home mh-comic">
      <header className="mc-header">
        <h2>헬스장 두 컷</h2>
        <span aria-hidden="true">✸</span>
      </header>
      <div className="mc-frames">
        <section className="mc-panel mc-now">
          <h3>지금</h3>
          <p>{comicLines[mood]}</p>
          <InkCat mood={mood} />
        </section>
        <section className="mc-panel mc-then">
          <h3>{mood === 'done' ? '달성!' : '목표를 채우면'}</h3>
          <InkCat mood="done" />
        </section>
      </div>
      <section className="mc-meter" aria-label="오늘 기록한 단백질">
        <div>
          <p>오늘 기록한 단백질</p>
          <div className="mc-total">
            <strong>{grams(props.total)} g</strong>
            <span> / {grams(props.target)} g</span>
          </div>
        </div>
        <div className="mc-remainder">
          <Remaining value={props.remaining} />
        </div>
        <progress value={props.percent} max={100} aria-label="오늘 목표 진행률" />
      </section>
      <div className="mc-actions">
        <button type="button" onClick={() => props.onAdd()}>
          <Icon name="plus" size={18} /> 음식 기록
        </button>
        {mood === 'done' && (
          <button type="button" onClick={props.onShare}>
            달성 카드
          </button>
        )}
      </div>
      <MastLog entries={props.entries} onEdit={props.onEdit} />
    </div>
  )
}

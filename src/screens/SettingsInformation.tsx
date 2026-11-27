import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, ArrowUpRight, ChevronDown } from 'lucide-react'
import { appName, englishAppName } from '../app/branding'
import { privacyPolicy, supportEmail, termsOfService } from '../app/legal'
import { estimateMeal, mealIngredients, mealRecipes, mealReference } from '../app/meal-estimates'
import { readLanguage } from '../language'
import './settings-information.css'

export type SettingsInformationPage = 'help' | 'privacy' | 'terms' | 'app-info' | 'account-deletion'

interface SettingsInformationProps {
  page: SettingsInformationPage
  onNavigate: (page: SettingsInformationPage) => void
  onBack: () => void
}

const licenses = [
  { name: 'Astryx', file: 'astryx.txt' },
  { name: 'Pretendard', file: 'pretendard.txt' },
  { name: 'Figtree', file: 'figtree.txt' },
]

function DisclosureTitle({ children }: { children: ReactNode }) {
  return (
    <summary>
      {children}
      <ChevronDown size={17} aria-hidden="true" />
    </summary>
  )
}

function MealEstimateHelp() {
  const ref = mealReference
  const pork = mealIngredients.pork.proteinPer100G
  const example = estimateMeal('meal-meat-fish', {
    heightCm: ref.heightCm, weightKg: ref.weightKg, sex: 'male', purpose: 'balance',
  })

  return (
    <div className="settings-info-answer">
      <p>일반식은 먹은 양을 인분으로 기록해요. 한 끼를 다 먹었으면 1인분, 절반을 먹었으면 0.5인분을 입력하세요. 프로필과 식사 유형으로 1인분의 단백질량을 계산해 두고, 인분을 바꾸면 섭취량을 다시 계산해요. 단백질량을 직접 입력할 수도 있어요. 프로필 기준 분량이 같으면 마지막으로 기록한 수치를 다시 보여 줘요.</p>
      <ol className="meal-help-list">
        <li>
          <strong>분량 보정</strong> = (키 ÷ {ref.heightCm}cm × {ref.heightShare} + 몸무게 ÷ {ref.weightKg}kg × {ref.weightShare}) × 성별 계수.
          남성은 {ref.maleFactor}, 여성은 {ref.femaleFactor}, 선택하지 않으면 1을 사용해요. 프로필이 없으면 {ref.heightCm}cm, {ref.weightKg}kg과 계수 1을 사용해요.
        </li>
        <li><strong>1인분 예상 무게</strong> = 아래 유형별 기준 무게 × 분량 보정. 보정값을 {ref.minimumFactor}~{ref.maximumFactor}로 제한하고, 예상 무게는 {ref.weightStepG}g 단위로 반올림해요.</li>
        <li><strong>먹은 단백질</strong> = 먹은 인분 × 1인분 예상 무게 × 100g당 단백질 ÷ 100. 100g당 단백질은 재료별 수치에 무게 비율을 곱해 더한 값이며, 최종 단백질량은 정수 g으로 반올림해요.</li>
      </ol>
      <ul className="meal-help-list">
        {Object.entries(mealRecipes).map(([id, recipe]) => (
          <li key={id}>
            <strong>{recipe.name}</strong> · {recipe.referenceWeightG}g / 단백질 약 {estimateMeal(id)?.proteinG}g.
            {' '}{recipe.ingredients.map(([ingredient, share]) => `${mealIngredients[ingredient].name} ${share}%`).join(', ')}
          </li>
        ))}
      </ul>
      <p>예를 들어 삼겹살구이는 조리 후 100g당 단백질 {pork}g을 적용해요. 삼겹살만 150g 먹으면 약 {Math.round(pork * 1.5)}g, 200g 먹으면 약 {Math.round(pork * 2)}g이에요. 조리 전 중량이나 생선·살코기의 실제 수치는 달라요.</p>
      {example && <p>{ref.heightCm}cm·{ref.weightKg}kg 남성이 고기·생선 위주 식사를 고르면 1인분은 단백질 약 {example.proteinG}g으로 계산해요.</p>}
      <p>기준 무게, 예시 구성과 성별 계수는 기록을 돕기 위한 앱의 가정이에요. 실제로 먹은 양이나 영양표시를 아는 경우 그 값을 적용할 수 있어요.</p>
      <ul className="meal-help-list meal-help-sources">
        {Object.values(mealIngredients).map(({ name, proteinPer100G, source }) => (
          <li key={name}>
            <a href={source} target="_blank" rel="noreferrer">
              {name} 100g당 {proteinPer100G}g <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Help({ onNavigate }: Pick<SettingsInformationProps, 'onNavigate'>) {
  return (
    <div className="panel settings-info-disclosures">
      <details>
        <DisclosureTitle>섭취 기록은 어떻게 추가하나요?</DisclosureTitle>
        <div className="settings-info-answer">
          <p>오늘 화면의 빠른 기록에서 음식을 고르거나 음식 검색에서 찾아서 추가할 수 있어요. 찾는 음식이 없으면 직접 입력에서 이름과 단백질량을 입력하세요.</p>
          <p>섭취 기록 화면에서 날짜를 고르면 각 기록을 수정하거나 삭제할 수 있어요.</p>
        </div>
      </details>
      <details>
        <DisclosureTitle>하루 목표량은 어떻게 정하나요?</DisclosureTitle>
        <div className="settings-info-answer">
          <p>하루 단백질 목표에서 목표량을 직접 입력하거나 몸무게와 관리 목적을 기준으로 계산한 참고값을 선택할 수 있어요.</p>
        </div>
      </details>
      <details>
        <DisclosureTitle>음식별 단백질량은 어떻게 계산하나요?</DisclosureTitle>
        <div className="settings-info-answer">
          <p>한 포장 또는 1회분의 단백질량에 먹은 수량을 곱해요. 1개당 20g인 음료를 반만 마셨다면 0.5개, 단백질 10g으로 기록해요. 삶은 달걀은 껍데기를 제외한 약 48g을 1개로 보고, 식약처 수치인 100g당 13.49g을 적용해 약 6.5g으로 계산해요.</p>
          <p>각 음식의 입력창에서 영양정보 출처를 확인할 수 있어요. ‘공개 비교시험 환산’은 시험의 100g당 단백질에 해당 제품의 포장 중량을 곱해 100으로 나눈 1포장 값이에요. 구매한 제품의 표시가 다르면 실제 포장에 적힌 값을 입력하세요.</p>
        </div>
      </details>
      <details>
        <DisclosureTitle>일반식의 한 끼 추정치는 어떻게 계산하나요?</DisclosureTitle>
        <MealEstimateHelp />
      </details>
      <details>
        <DisclosureTitle>내 기록은 어디에 저장되나요?</DisclosureTitle>
        <div className="settings-info-answer">
          <p>섭취 기록, 즐겨찾기, 빠른 기록 목록과 직접 추가한 음식은 계정에 저장돼요. 같은 계정으로 로그인하면 다른 기기에서도 불러올 수 있어요. 프로필, 하루 목표와 알림 설정은 이 기기에 보관해요.</p>
          <Button
            className="settings-info-link"
            label="개인정보 처리방침 보기"
            variant="ghost"
            onClick={() => onNavigate('privacy')}
          />
        </div>
      </details>
      <a className="settings-info-contact" href={`mailto:${supportEmail}`}>
        <span>
          <strong>문의하기</strong>
          <span>{supportEmail}</span>
        </span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  )
}

function License({ name, file }: (typeof licenses)[number]) {
  const [content, setContent] = useState<'loading' | 'error' | { text: string } | null>(null)

  async function load() {
    setContent('loading')
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}licenses/${file}`)
      if (!response.ok || response.headers.get('content-type')?.startsWith('text/html')) {
        throw new Error('License text is unavailable')
      }
      setContent({ text: await response.text() })
    } catch {
      setContent('error')
    }
  }

  return (
    <details onToggle={(event) => {
      if (event.currentTarget.open && content === null) void load()
    }}>
      <DisclosureTitle>{name}</DisclosureTitle>
      <div className="settings-info-answer">
        {content === 'loading' ? (
          <p role="status">라이선스를 불러오는 중이에요.</p>
        ) : content === 'error' ? (
          <>
            <p role="status">라이선스를 불러오지 못했어요.</p>
            <Button className="settings-info-link" variant="ghost" label="다시 시도" onClick={load} />
          </>
        ) : content ? (
          <pre className="settings-info-license" lang="en">{content.text}</pre>
        ) : null}
      </div>
    </details>
  )
}

function AppInformation() {
  const licensesTitleId = useId()
  const [version, setVersion] = useState('1.0 (빌드 1)')
  const [language, setLanguage] = useState('브라우저 또는 기기에 설정된 언어를 확인할 수 있어요.')
  const [readingLanguage, setReadingLanguage] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let active = true
    void App.getInfo().then((info) => {
      if (active) setVersion(`${info.version} (빌드 ${info.build})`)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  async function checkLanguage() {
    setReadingLanguage(true)
    try {
      const { source, tag } = await readLanguage()
      setLanguage(`${source} · ${tag}`)
    } catch {
      setLanguage('언어를 읽지 못했어요. 다시 확인해 주세요.')
    } finally {
      setReadingLanguage(false)
    }
  }

  return (
    <>
      <dl className="panel settings-info-version">
        <div>
          <dt>앱 이름</dt>
          <dd>{appName} <span lang="en">({englishAppName})</span></dd>
        </div>
        <div>
          <dt>앱 버전</dt>
          <dd>{version}</dd>
        </div>
      </dl>
      <div className="panel settings-info-tools">
        <div className="settings-info-language">
          <div>
            <h2>기기 언어</h2>
            <p role="status">{readingLanguage ? '언어를 확인하는 중…' : language}</p>
          </div>
          <Button label="언어 확인" onClick={checkLanguage} isLoading={readingLanguage} />
        </div>
      </div>
      <section className="settings-info-licenses" aria-labelledby={licensesTitleId}>
        <h2 id={licensesTitleId} className="section-heading">오픈소스 라이선스</h2>
        <div className="panel settings-info-disclosures">
          {licenses.map((license) => <License key={license.file} {...license} />)}
          {import.meta.env.PROD ? <License name="앱 라이브러리" file="npm.md" /> : null}
        </div>
      </section>
    </>
  )
}

function AccountDeletionInformation() {
  const subject = encodeURIComponent(appName + ' 계정 삭제 요청')
  return (
    <div className="panel settings-info-document">
      <p>{appName} 계정 삭제를 이메일로 요청할 수 있어요. 로그인에 사용한 이메일 주소에서 요청을 보내 주세요. 본인 확인이 필요하면 운영자가 회신해요.</p>
      <a className="settings-info-contact" href={`mailto:${supportEmail}?subject=${subject}`}>
        <span>
          <strong>이메일로 계정 삭제 요청하기</strong>
          <span>{supportEmail}</span>
        </span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
      <section>
        <h2>삭제되는 데이터</h2>
        <p>계정과 계정에 저장된 섭취 기록, 즐겨찾기, 빠른 기록 목록, 직접 추가한 음식이 삭제돼요. 각 기기에 남은 사본과 설정은 해당 기기의 앱 저장 데이터나 브라우저 사이트 데이터를 지우면 삭제돼요.</p>
      </section>
      <section>
        <h2>앱에서 탈퇴하기</h2>
        <p>앱의 내 설정에서 회원 탈퇴를 선택하면 계정과 탈퇴에 사용한 기기에 있는 해당 계정의 데이터가 함께 삭제돼요.</p>
      </section>
    </div>
  )
}

export function SettingsInformation({ page, onNavigate, onBack }: SettingsInformationProps) {
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const document = page === 'privacy' ? privacyPolicy : page === 'terms' ? termsOfService : null
  const title = document?.title ?? (page === 'help' ? '도움말' : page === 'account-deletion' ? '계정 삭제 요청' : '앱 정보')

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    titleRef.current?.focus({ preventScroll: true })
  }, [page])

  return (
    <section className="settings-information" aria-labelledby={titleId}>
      <header className="settings-info-header">
        <Button
          label="뒤로 가기"
          className="settings-info-back"
          data-android-back
          icon={<ArrowLeft size={19} />}
          variant="ghost"
          isIconOnly
          onClick={onBack}
        />
        <h1 id={titleId} ref={titleRef} tabIndex={-1}>{title}</h1>
      </header>
      {document ? (
        <div className="panel settings-info-document">
          <p>{document.intro}</p>
          {page === 'privacy' && (
            <a className="settings-info-contact" href="#profile/account-deletion" onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onNavigate('account-deletion')
            }}>
              <strong>계정 삭제 요청</strong>
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          )}
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      ) : page === 'help' ? (
        <Help onNavigate={onNavigate} />
      ) : page === 'account-deletion' ? (
        <AccountDeletionInformation />
      ) : (
        <AppInformation />
      )}
    </section>
  )
}

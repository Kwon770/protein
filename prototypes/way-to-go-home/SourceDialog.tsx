import { useState } from 'react'
import { groups, type Group } from './catalog'
import { StudioDialog } from './RecordDialog'
import { Icon } from './ui'
import utilityTSX from './concepts/utility.tsx?raw'
import utilityCSS from './concepts/utility.css?raw'
import mascotTSX from './concepts/mascot.tsx?raw'
import mascotCSS from './concepts/mascot.css?raw'
import graphicTSX from './concepts/graphic.tsx?raw'
import graphicCSS from './concepts/graphic.css?raw'
import rhythmTSX from './concepts/rhythm.tsx?raw'
import rhythmCSS from './concepts/rhythm.css?raw'
import modelSource from './model.ts?raw'

type SourceGroup = Exclude<Group, 'all'>
const sources: Record<SourceGroup, [string, string]> = {
  utility: [utilityTSX, utilityCSS],
  mascot: [mascotTSX, mascotCSS],
  graphic: [graphicTSX, graphicCSS],
  rhythm: [rhythmTSX, rhythmCSS],
}

export function SourceDialog({ group, onClose }: { group: SourceGroup; onClose: () => void }) {
  const [active, setActive] = useState(group)
  const [file, setFile] = useState(0)
  const [status, setStatus] = useState('')
  const contents = file === 2 ? modelSource : sources[active][file]
  const filename = file === 2 ? 'model.ts' : `concepts/${active}.${file === 0 ? 'tsx' : 'css'}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(contents)
      setStatus('복사했어요.')
    } catch {
      setStatus('복사 권한을 확인하거나 소스 파일을 다운로드하세요.')
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename.split('/').at(-1) ?? 'source.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <StudioDialog title="시안 소스코드" onClose={onClose} wide>
      <div className="studio-source-controls">
        <label>
          시안 그룹
          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value as SourceGroup)
              setFile(0)
              setStatus('')
            }}
          >
            {groups
              .filter((item) => item.id !== 'all')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <div className="studio-source-tabs" aria-label="파일 선택">
          {['React', 'CSS', '공통 데이터'].map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={file === index}
              onClick={() => {
                setFile(index)
                setStatus('')
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="studio-code-header">
        <code>{filename}</code>
        <button className="studio-text-button" type="button" onClick={copy}>
          복사
        </button>
        <button
          className="studio-icon-button"
          type="button"
          onClick={download}
          aria-label="소스 파일 다운로드"
        >
          <Icon name="download" size={17} />
        </button>
      </div>
      <pre className="studio-code" tabIndex={0}>
        <code>{contents}</code>
      </pre>
      {status && (
        <p role="status" className="studio-share-status">
          {status}
        </p>
      )}
    </StudioDialog>
  )
}

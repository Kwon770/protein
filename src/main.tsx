import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@astryxdesign/core/theme'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import korean from '@astryxdesign/core/locales/ko-KR.generated.js'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InternationalizationProvider locale="ko-KR" messages={{ 'ko-KR': korean }}>
      <Theme theme={neutralTheme} mode="dark">
        <App />
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
)

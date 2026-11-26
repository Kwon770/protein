import { useId, type Ref } from 'react'
import { Button } from '@astryxdesign/core/Button'

type AmountStepperProps = {
  label: string
  value: string
  current: number
  max: number
  steps?: readonly [small: number, large: number]
  allowsDecimals?: boolean
  placeholder?: string
  description?: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
  onChange: (value: string) => void
}

export function AmountStepper({
  label,
  value,
  current,
  max,
  steps: [smallStep, largeStep] = [1, 5],
  allowsDecimals,
  placeholder,
  description,
  error,
  inputRef,
  onChange,
}: AmountStepperProps) {
  const id = useId()
  const message = error || description

  function stepButton(step: number) {
    const action = step < 0 ? '줄이기' : '늘리기'
    const text = `${step < 0 ? '−' : '+'}${Math.abs(step)}`
    return (
      <Button
        className="entry-step-button"
        label={`${label} ${Math.abs(step)} ${action}`}
        type="button"
        size="lg"
        isDisabled={step < 0 ? current <= 0 : current >= max}
        onClick={() => {
          const next = Math.min(max, Math.max(0, current + step))
          onChange(String(Number(next.toFixed(8))))
        }}
      >
        {text}
      </Button>
    )
  }

  return (
    <div className="entry-stepper">
      <label htmlFor={id}>{label}</label>
      <div className="entry-step-controls">
        {stepButton(-largeStep)}
        {stepButton(-smallStep)}
        <input
          ref={inputRef}
          id={id}
          className="entry-step-value"
          inputMode={allowsDecimals ? 'decimal' : 'numeric'}
          autoComplete="off"
          enterKeyHint="done"
          placeholder={placeholder}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        {stepButton(smallStep)}
        {stepButton(largeStep)}
      </div>
      {message && (
        <p id={`${id}-hint`} className="entry-step-hint" role={error ? 'alert' : undefined}>
          {message}
        </p>
      )}
    </div>
  )
}

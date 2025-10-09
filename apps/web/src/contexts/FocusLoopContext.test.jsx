import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { FocusLoopProvider, useFocusLoop } from './FocusLoopContext'

function Harness() {
  const {
    session,
    stats,
    todayTotal,
    streak,
    startFocus,
    pauseFocus,
    resumeFocus,
    cancelFocus,
    completeFocus,
    setTarget,
  } = useFocusLoop()
  return (
    <div>
      <div data-testid="session-running">{session?.running ? 'yes' : 'no'}</div>
      <div data-testid="session-remaining">{session?.remainingSec ?? 0}</div>
      <div data-testid="today-total">{todayTotal}</div>
      <div data-testid="target">{stats.target}</div>
      <div data-testid="streak">{streak}</div>
      <div data-testid="last">{stats.lastMessage || ''}</div>
      <button onClick={() => startFocus({ minutes: 1, quadrant: 'Q2' })}>start1</button>
      <button onClick={() => pauseFocus()}>pause</button>
      <button onClick={() => resumeFocus()}>resume</button>
      <button onClick={() => cancelFocus()}>cancel</button>
      <button onClick={() => completeFocus()}>complete</button>
      <button onClick={() => setTarget(90)}>target90</button>
    </div>
  )
}

function setup() {
  return render(
    <FocusLoopProvider>
      <Harness />
    </FocusLoopProvider>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  // isolate localStorage between tests
  try {
    localStorage.clear()
  } catch {}
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('FocusLoopContext', () => {
  it('starts and completes a focus session updating stats and message', () => {
    setup()
    expect(screen.getByTestId('today-total').textContent).toBe('0')
    act(() => {
      fireEvent.click(screen.getByText('start1'))
    })
    expect(screen.getByTestId('session-running').textContent).toBe('yes')
    act(() => {
      fireEvent.click(screen.getByText('complete'))
    })
    expect(screen.getByTestId('today-total').textContent).toBe('1')
    expect(screen.getByTestId('streak').textContent).not.toBe('0')
    expect(screen.getByTestId('last').textContent).toMatch(/\+1 min/)
  })

  it('handles pause and resume ticks', () => {
    setup()
    act(() => {
      fireEvent.click(screen.getByText('start1'))
    })
    // let 2 seconds elapse
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    const after2 = Number(screen.getByTestId('session-remaining').textContent)
    expect(after2).toBeLessThan(60)
    act(() => {
      fireEvent.click(screen.getByText('pause'))
    })
    const paused = Number(screen.getByTestId('session-remaining').textContent)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // still the same when paused
    expect(Number(screen.getByTestId('session-remaining').textContent)).toBe(paused)
    act(() => {
      fireEvent.click(screen.getByText('resume'))
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(Number(screen.getByTestId('session-remaining').textContent)).toBeLessThan(paused)
    act(() => {
      fireEvent.click(screen.getByText('cancel'))
    })
  })

  it('updates target value', () => {
    setup()
    expect(screen.getByTestId('target').textContent).toBe('120')
    act(() => {
      fireEvent.click(screen.getByText('target90'))
    })
    expect(screen.getByTestId('target').textContent).toBe('90')
  })

  it('starts via global event', () => {
    setup()
    act(() => {
      window.dispatchEvent(
        new CustomEvent('focus:start', { detail: { minutes: 1, taskId: 't1', quadrant: 'Q2' } })
      )
      // ensure any queued microtasks or immediate timers flush
      vi.advanceTimersByTime(0)
    })
    expect(screen.getByTestId('session-running').textContent).toBe('yes')
  })
})

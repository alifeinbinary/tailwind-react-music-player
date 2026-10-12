export function formatTime(second: number): string {
  let i = 0
  let h = 0
  let s = parseInt(String(second))
  if (s >= 60) {
    i = parseInt(String(s / 60))
    s = parseInt(String(s % 60))
    if (i >= 60) {
      h = parseInt(String(i / 60))
      i = parseInt(String(i % 60))
    }
  }
  // 补零
  const zero = (v: number | string) => ((v as number) >> 0 < 10 ? `0${v}` : v)
  if (h > 0) return [zero(h), zero(i), zero(s)].join(':')
  return [zero(i), zero(s)].join(':')
}

export function createRandomNum(minNum: number, maxNum: number): number {
  return parseInt(String(Math.random() * (maxNum - minNum + 1) + minNum), 10)
}

export function distinct<T>(array: T[]): T[] {
  return array
    .map((item) => JSON.stringify(item))
    .filter((item, idx, arr) => idx === arr.indexOf(item))
    .map((item) => JSON.parse(item))
}

export const arrayEqual = (arr1: any[]) => (arr2: any[]) =>
  JSON.stringify(arr1) === JSON.stringify(arr2)

const s4 = () => {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}
// Generate a pseudo-GUID by concatenating random hexadecimal.
export const uuId = (): string => {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

export const isSafari = (): boolean => {
  return (
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  )
}

// https://stackoverflow.com/a/9039885/2789451
export function isIOS(): boolean {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod',
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  )
}

// https://stackoverflow.com/questions/7451508/html5-audio-playback-with-fade-in-and-fade-out
export function swing(p: number): number {
  return 0.5 - Math.cos(p * Math.PI) / 2
}

export interface AdjustVolumeOptions {
  duration?: number
  easing?: (p: number) => number
  interval?: number
}

export interface AdjustVolumeResult {
  fadeInterval: ReturnType<typeof setInterval> | undefined
  updateIntervalEndVolume: ((newVolume: number) => void) | undefined
}

export function adjustVolume(
  element: HTMLMediaElement,
  startVolume: number,
  endVolume: number,
  { duration = 1000, easing = swing, interval = 13 }: AdjustVolumeOptions = {},
  callback: () => void,
): AdjustVolumeResult {
  let delta = endVolume - startVolume

  if (!delta || !duration || !easing || !interval || isIOS()) {
    element.volume = endVolume
    callback()
    return { fadeInterval: undefined, updateIntervalEndVolume: undefined }
  }

  const ticks = Math.floor(duration / interval)
  let tick = 1

  const updateIntervalEndVolume = (newVolume: number) => {
    endVolume = newVolume
  }

  const timer = setInterval(() => {
    // End volume may have changed in middle of fading
    const newDelta = endVolume - startVolume
    if (newDelta !== delta) {
      delta = newDelta
    }

    element.volume = startVolume + easing(tick / ticks) * delta
    if (++tick >= ticks) {
      element.volume = endVolume
      clearInterval(timer)
      callback()
    }
  }, interval)

  return {
    fadeInterval: timer,
    updateIntervalEndVolume,
  }
}

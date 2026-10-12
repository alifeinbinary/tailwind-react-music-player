import LOCALE from '../config/locale'
import { type TailwindReactMusicPlayerCustomLocale } from '../types'
import en_US from './en_US'
import en_GB from './en_GB'
import zh_CN from './zh_CN'

const locale: Record<string, TailwindReactMusicPlayerCustomLocale> = {
  [LOCALE.en_US]: en_US,
  [LOCALE.en_GB]: en_GB,
  [LOCALE.zh_CN]: zh_CN,
}

export default locale

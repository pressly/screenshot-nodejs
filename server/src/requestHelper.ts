import { LoadEvent, PDFFormat, ScreenshotOptions, Viewport, PDFOptions } from 'puppeteer';
import { URL } from 'url'

export const DEFAULT_VIEWPORT = [800, 600]
export const DEFAULT_CROP     = [800, 600]
export const DEFAULT_X        = 1
export const DEFAULT_Y        = 1

export const waitUntilOptions: LoadEvent[] = [
  'networkidle2', 'networkidle0', 'domcontentloaded', 'load'
]

export const pdfFormatOptions: PDFFormat[] = [
  'Letter', 'Legal', 'Tabload', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
]

type Query = Record<string, string | undefined>

export const getProperitiesFromImg = ({ 
  window, crop, x, y, waitUntil, jpegQuality 
} : Query): [Viewport, ScreenshotOptions, LoadEvent] => {
  if (window && !crop)
    crop = window
  if (!crop)
    [x, y] = ['0', '0']
  waitUntil = waitUntil 
    ? waitUntilOptions.find(opt => opt.toLowerCase() === (waitUntil as string).toLowerCase())
    : 'networkidle2'
    
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => strictParseInt(n)) : DEFAULT_VIEWPORT

  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT  

  let [width, height] = crop ? crop.split('x').map(n => strictParseInt(n)) : DEFAULT_CROP
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  const numX = x ? strictParseInt(x) : DEFAULT_X
  const numY = y ? strictParseInt(y) : DEFAULT_Y

  const jpegQualityNum = jpegQuality ? strictParseInt(jpegQuality) : undefined
  return [
    {
      width: vpWidth, 
      height: vpHeight
    } as Viewport,
    {
      clip: {
        width,
        height,
        x: numX,
        y: numY
      },
      quality: jpegQualityNum
    } as ScreenshotOptions,
    waitUntil as LoadEvent
  ]
}

export const getProperitiesFromPdf = ({ 
  format, waitUntil, window, scale, margin, printBackground, 
  landscape, displayHeaderFooter, path, pageRanges
} : Query): [Viewport, PDFOptions, LoadEvent] => {
  const pdfFormat = format 
    ? pdfFormatOptions.find(opt => opt.toLowerCase() === (format as string).toLowerCase()) 
    : undefined

  waitUntil = waitUntil 
    ? waitUntilOptions.find(opt => opt.toLowerCase() === (waitUntil as string).toLowerCase())
    : 'networkidle2'
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => strictParseInt(n)) : DEFAULT_VIEWPORT
    
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  //                      this is `any` because typescript doesn't have a type for NaN
  let scaleNum = scale ? (Number(scale) as any | number) : undefined
  if (isNaN(scaleNum)) scaleNum = undefined

  // top:30;left:50%;right:60px;bottom:70 => { 'top': '30', 'left': '50%', 'right': '60px', 'bottom': '70' }
  const marginObj = margin 
    ? margin.split(';')
      .map(param => {
        const [key, value] = param.split(':')
        return key && value ? { [key]: value } : undefined
      })
      .filter(x => typeof x !== 'undefined')
      .reduce((prev, cur) => {
        if (cur === undefined) return prev
        const key = Object.keys(cur)[0]

        return {...prev,
          [key]: cur[key]
        }
      }, {})
    : undefined

  const printBackgroundBool = printBackground 
    ? printBackground.toLowerCase() == 'true'
    : undefined
    
  const landscapeBool = landscape
    ? landscape.toLowerCase() == 'true'
    : undefined

  const displayHeaderFooterBool = displayHeaderFooter 
    ? displayHeaderFooter.toLowerCase() == 'true' 
    : undefined
  
  return [
    {
      width: vpWidth,
      height: vpHeight
    } as Viewport,
    {
      format: pdfFormat,
      displayHeaderFooter: displayHeaderFooterBool,
      landscape: landscapeBool,
      printBackground: printBackgroundBool,
      margin: marginObj as any, // dw about it typescript I got this :sweat_emoji:
      path, 
      pageRanges,
      scale: scaleNum
    } as PDFOptions,
    waitUntil as LoadEvent
  ]
}

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

const headersToIgnore = [
  'Host'
]

/**
 * pass through cookies, auth, etc. 
 * Using rawHeaders to ensure the values are strings
 * `req.headers` could have array values 
 * Ex: [ 'headerKey', 'headerValue', ... ] => { 'headerKey': 'headerValue', ... } 
 */ 
export const transformHeaders = (rawHeaders: string[]): Record<string, string> => 
  rawHeaders.reduce((prev, cur, i, array) =>
    i % 2 === 0 && !headersToIgnore.includes(cur)
    ? {...prev,
        [cur]: array[i + 1]
      }
    : prev
  , {})

  const strictParseInt = (s: string) =>
      // parseInt is not strict 
      parseInt(Number(s) as any, 10)
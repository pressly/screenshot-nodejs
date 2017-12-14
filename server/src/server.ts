import { URL } from 'url'
import * as express from 'express'
import { Request, Response } from 'express';
import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import { LoadEvent, PDFFormat, ScreenshotOptions, Viewport, PDFOptions } from 'puppeteer';
import Browser from './browser'

const NUM_BROWSERS = parseInt(process.argv[2], 10)

/*
 * IMPORTANT - each browser is listening to process's "exit" event
 * this line allows more than the default 10 listeners / browsers open at a time
 */
 process.setMaxListeners(NUM_BROWSERS)

if (!NUM_BROWSERS)
  throw new Error('Need to specify a non zero NUM_BROWSERS')

const DEFAULT_VIEWPORT = [800, 600]
const DEFAULT_CROP     = [800, 600]
const DEFAULT_X        = 1
const DEFAULT_Y        = 1

const browserOptions = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}

const browser = new Browser(browserOptions, NUM_BROWSERS)

const app  = express()
const port = 3000

const limiter = new RateLimit({
  windowMs: 2 * 1000, // 2 seconds
  max: NUM_BROWSERS, // limit to `NUM_BROWSER` requests per windowMs 
  delayAfter: NUM_BROWSERS * 2,
  delayMs: 0 // disable delaying - full speed until the max limit is reached
})

app.use(limiter)

app.get('/png', async (req: Request, res: Response) => {
  if (!req.query.url || !isValidUrl(req.query.url)) {
    res.status(422)
      .send('need a valid url')
    return
  }

  const url = decodeURIComponent(req.query.url)

  const [ viewport, options, waitUntil ] = getProperitiesFromImg(req.query)

  options.type = 'png'

  const headers = transformHeaders(req.rawHeaders)

  try {
    const picture = await browser.screenshot(headers, url, options, viewport, waitUntil)
    res.status(200)
      .set('Content-type', 'image/png')
      .send(picture)
  } catch(e) {
      res.status(500)
        .send(`Puppeteer Failed 
          - url: ${url} 
          - screenshot options: ${JSON.stringify(options)} 
          - viewport: ${JSON.stringify(viewport)} 
          - waitUntil: ${waitUntil}
          - stacktrace: \n\n${e.stack}`)
  }
})

app.get('/jpeg', async (req: Request, res: Response): Promise<void> => {
  if (!req.query.url || !isValidUrl(req.query.url)) {
    res.status(422)
      .send('need a url')
    return
  }
  const url = decodeURIComponent(req.query.url)

  const [ viewport, options, waitUntil ] = getProperitiesFromImg(req.query)

  options.type = 'jpeg'

  const headers = transformHeaders(req.rawHeaders)

  try {
    const picture = await browser.screenshot(headers, url, options, viewport, waitUntil)
    res.status(200)
      .set('Content-type', 'image/jpeg')
      .send(picture)
  } catch(e) {
    res.status(500)
    .send(`Puppeteer Failed 
      - url: ${url} 
      - screenshot options: ${JSON.stringify(options)} 
      - viewport: ${JSON.stringify(viewport)} 
      - waitUntil: ${waitUntil}
      - stacktrace: \n\n${e.stack}`)
  }
})

app.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  if (!req.query.url || !isValidUrl(req.query.url)) {
    res.status(422)
      .send('need a url')
    return
  } 
  const url = decodeURIComponent(req.query.url)
      
  const [ viewport, pdfOptions, waitUntil ] = getProperitiesFromPdf(req.query)

  const headers = transformHeaders(req.rawHeaders)

  try {
    const pdfBuffer = await browser.pdf(headers, url, viewport, pdfOptions, waitUntil)
    res.status(200)
      .set('Content-type', 'application/pdf')
      .send(pdfBuffer)
  } catch(e) {
      res.status(500)
        .send(`Puppeteer Failed 
        - url: ${url} 
        - pdf options: ${JSON.stringify(pdfOptions)} 
        - viewport: ${JSON.stringify(viewport)} 
        - waitUntil: ${waitUntil}
        - stacktrace: \n\n${e.stack}`)
  }
})

app.listen(port, () => console.log(`server listening on port ${port}`))

/* Helper Functions */

const waitUntilOptions: LoadEvent[] = [
  'networkidle2', 'networkidle0', 'domcontentloaded', 'load'
]

const pdfFormatOptions: PDFFormat[] = [
  'Letter', 'Legal', 'Tabload', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
]

type Query = Record<string, string | undefined>

const getProperitiesFromImg = ({ 
  window, crop, x, y, waitUntil, jpegQuality 
} : Query): [Viewport, ScreenshotOptions, LoadEvent] => {
  if (window && !crop)
    crop = window
  if (!crop)
    [x, y] = ['0', '0']
  waitUntil = waitUntil 
    ? waitUntilOptions.find(opt => opt.toLowerCase() === (waitUntil as string).toLowerCase())
    : 'networkidle2'
    
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : DEFAULT_VIEWPORT

  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT  

  let [width, height] = crop ? crop.split('x').map(n => parseInt(n, 10)) : DEFAULT_CROP
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  const numX = x ? parseInt(x, 10) : DEFAULT_X
  const numY = y ? parseInt(y, 10) : DEFAULT_Y

  const jpegQualityNum = jpegQuality ? parseInt(jpegQuality, 10) : undefined 
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

const getProperitiesFromPdf = ({ 
  format, waitUntil, window, scale, margin, printBackground, 
  landscape, displayHeaderFooter, path, pageRanges
} : Query): [Viewport, PDFOptions, LoadEvent] => {
  const pdfFormat = format 
    ? pdfFormatOptions.find(opt => opt.toLowerCase() === (format as string).toLowerCase()) 
    : undefined
  waitUntil = waitUntil 
    ? waitUntilOptions.find(opt => opt.toLowerCase() === (waitUntil as string).toLowerCase())
    : 'networkidle2'
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : DEFAULT_VIEWPORT
    
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  const scaleNum = scale ? parseFloat(scale) : undefined

  // top:30;left:50%;right:60px;bottom:70 => { 'top': '30', 'left': '50%', 'right': '60px', 'bottom': '70' }
  const marginObj = margin 
    ? margin.split(';')
      .map(param => {
        const [key, value] = param.split(':')
        return key && value ? { [key]: value } : undefined
      }).filter(x => typeof x !== 'undefined')
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

const isValidUrl = (url: string): boolean => {
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
const transformHeaders = (rawHeaders: string[]): Record<string, string> => 
  rawHeaders.reduce((prev, cur, i, array) =>
    i % 2 === 0 && !headersToIgnore.includes(cur)
    ? {...prev,
        [cur]: array[i + 1]
      }
    : prev
  , {})
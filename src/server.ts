import * as express from 'express'
import { Request, Response } from 'express';
import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import { Page, PageFnOptions, LoadEvent, PDFFormat } from 'puppeteer';
import Browser from './browser'

const NUM_BROWSERS = parseInt(process.argv[2], 10)

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

const app = express()
const port = 3000

const limiter = new RateLimit({
  windowMs: 2 * 1000, // 2 seconds
  max: NUM_BROWSERS, // limit to `NUM_BROWSER` requests per windowMs 
  delayAfter: NUM_BROWSERS,
  delayMs: 0 // disable delaying - full speed until the max limit is reached
})

app.use(limiter)

app.get('/png', async (req: Request, res: Response) => {
  let { url } = req.query

  if (!url)
    res.status(422)
      .send('need a url')
  
  const { x, y, vpWidth, vpHeight, width, height, waitUntil } = getProperitiesFrom(req.query)

  const headers = transformHeaders(req.rawHeaders)

  try {
    const picture = await browser.screenshot(headers, url, width, height, vpWidth, vpHeight, x, y, waitUntil)
    res.set('Content-type', 'image/png').send(picture)
  } catch(e) {
      res.status(500)
        .send(`Puppeteer Failed 
          - url: ${url} 
          - width: ${width} 
          - height: ${height} 
          - vpWidth: ${vpWidth}
          - vpHeight: ${vpHeight}
          - x: ${x} 
          - y: ${y} 
          - stacktrace: \n\n${e.stack}`)
  }
})

app.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.query

  if (!url)
    res.status(422)
      .send('need a url')

  const { vpWidth, vpHeight, width, height, waitUntil, format } = getProperitiesFrom(req.query)

  const headers = transformHeaders(req.rawHeaders)

  try {
    const pdfBuffer = await browser.pdf(headers, url, width, height, vpWidth, vpHeight, waitUntil, format)
    res.set('Content-type', 'application/pdf').send(pdfBuffer)
  } catch(e) {
      res.status(500)
        .send(`Puppeteer Failed 
          - url: ${url} 
          - width: ${width} 
          - height: ${height} 
          - vpWidth: ${vpWidth}
          - vpHeight: ${vpHeight}
          - format: ${format} 
          - stacktrace: \n\n${e.stack}`)
  }
})

app.listen(port, () => console.log(`server listening on port ${port}`))

const getProperitiesFrom = ({ window, crop, x, y, waitUntil, format } : Record<string, string | undefined>) => {
  const waitUntilOptions: LoadEvent[] = [
    'networkidle2', 'networkidle0', 'domcontentloaded', 'load'
  ]

  const pdfFormatOptions: PDFFormat[] = [
    'Letter', 'Legal', 'Tabload', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
  ]

  waitUntil = waitUntil && waitUntilOptions.includes(waitUntil as LoadEvent) ? waitUntil : 'networkidle2'
  format = format && pdfFormatOptions.includes(format as PDFFormat) ? format : undefined
  
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : DEFAULT_VIEWPORT
  
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  let [width, height] = crop ? crop.split('x').map(n => parseInt(n, 10)) : DEFAULT_CROP
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  const numX = x ? parseInt(x, 10) : DEFAULT_X
  const numY = y ? parseInt(y, 10) : DEFAULT_Y

  return { 
    x: numX, 
    y: numY,
    vpWidth, vpHeight, 
    width, height, 
    waitUntil: waitUntil as LoadEvent, 
    format: format as PDFFormat }
}

/**
 * pass through cookies, auth, etc. 
 * Using rawHeaders to ensure the values are strings
 * `req.headers` could have array values 
 * Ex:
 * [ 'headerKey', 'headerValue', ... ] => { 'headerKey': 'headerValue', ... } 
 */
const transformHeaders = (rawHeaders: string[]): Record<string, string> => 
  rawHeaders.reduce((prev, cur, i, array) =>
    i % 2 === 0 
    ? {...prev,
        [cur]: array[i + 1]
      }
    : prev
  , {})
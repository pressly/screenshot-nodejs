import * as express from 'express'
import { Request, Response } from 'express';
import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import { Page, PageFnOptions, LoadEvent } from 'puppeteer';
import Browser from './browser'

const NUM_BROWSERS = parseInt(process.argv[2], 10)

if (!NUM_BROWSERS)
  throw new Error('Need to specify a non zero NUM_BROWSERS')

const DEFAULT_VIEWPORT = [800, 600]
const DEFAULT_CROP     = [800, 600]
const DEFAULT_X        = 0
const DEFAULT_Y        = 0

const browserOptions = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}

const waitUntilOptions: string[] = [
  'networkidle2', 'networkidle0', 'domcontentloaded', 'load'
]

const browser = new Browser(browserOptions, NUM_BROWSERS)

const app = express()
const port = 3000

const limiter = new RateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: NUM_BROWSERS, // limit to `NUM_BROWSER` requests per windowMs 
  delayAfter: NUM_BROWSERS,
  delayMs: 200 // 
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
    if (!picture)
      throw new Error('picture not taken')
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

  const { x, y, vpWidth, vpHeight, width, height, waitUntil } = getProperitiesFrom(req.query)

  const headers = transformHeaders(req.rawHeaders)

  try {
    const pdfBuffer = await browser.pdf(headers, url, width, height, vpWidth, vpHeight, waitUntil as LoadEvent, undefined)
    if (!pdfBuffer)
      throw new Error('pdf not taken')
    res.set('Content-type', 'application/pdf').send(pdfBuffer)
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

app.listen(port, () => console.log(`server listening on port ${port}`))

const getProperitiesFrom = ({ window, crop, x, y, waitUntil } : Record<string, string>) => {
  waitUntil = waitUntilOptions.includes(waitUntil) ? waitUntil : 'networkidle2'
  
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : DEFAULT_VIEWPORT
  
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  let [width, height] = crop ? crop.split('x').map(n => parseInt(n, 10)) : DEFAULT_CROP
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  const numX = x ? parseInt(x as string, 10) : DEFAULT_X
  const numY = y ? parseInt(y as string, 10) : DEFAULT_Y
  return { x: numX, y: numY, vpWidth, vpHeight, width, height, waitUntil }
} 


/**
 * pass through cookies, auth, etc. 
 * Using rawHeaders to ensure the values are strings
 * `req.headers` could have array values 
*/
  
const transformHeaders = (rawHeaders: string[]): Record<string, string> => 
  rawHeaders.reduce((prev, cur, i, array) =>
    i % 2 === 0 
    ? {...prev,
        [cur]: array[i + 1]
      }
    : prev
  , {})
import * as express from 'express'
import { Request, Response } from 'express';
import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import { Page, PageFnOptions, ScreenshotOptions, PDFOptions } from 'puppeteer';
import Browser from './browser'

const NUM_BROWSERS = parseInt(process.argv[2], 10)

if (!NUM_BROWSERS)
  throw new Error('Need to specify a non zero NUM_BROWSERS')

const DEFAULT_VIEWPORT = [800, 600]
const DEFAULT_CROP     = [800, 600]
const DEFAULT_X        = 0
const DEFAULT_Y        = 0

const app = express()
const port = 3000

const limiter = new RateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: NUM_BROWSERS, // limit to `NUM_BROWSER` requests per windowMs 
  delayAfter: NUM_BROWSERS,
  delayMs: 200 // disable delaying - full speed until the max limit is reached
})

app.use(limiter)

type WaitUntilOptions = 'networkidle2' | 'networkidle0' | 'domcontentloaded' | 'load'
// type FormatOptions = 'Letter' | 'Legal'

const browserOptions = Object.freeze({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
})

const waitUntilOptions = Object.freeze([
  'networkidle2', 'networkidle0', 'domcontentloaded', 'load'
])

const browser = new Browser(browserOptions, NUM_BROWSERS)

const screenshot = async (headers: Record<string, string>, 
  url: string, 
  width: number, height: number, vpWidth: number, vpHeight: number, 
  x: number, y: number, waitUntil: WaitUntilOptions, retry = 0): Promise<Buffer | void> => {
  let page: Page | null = null
  try { 
    if (!browser)
      throw new Error('Browser couldn\'t open')
    
    page = await browser.newPage()

    if (!page)
      throw new Error('Couldn\'t create new page')
    
    await page.setViewport({ width: vpWidth, height: vpHeight })

    await page.setExtraHTTPHeaders(headers)
    
    await page.goto(url, { waitUntil })
    
    let options: ScreenshotOptions = { fullPage: true }

    if (x && y && width && height)
      options = {
        clip: { x, y, width, height }
      }
    
    return await page.screenshot(options)   
  } catch (e) {
    console.log('console err---\n', e.stack)
    if (page)
      await (page as Page).close()
    
    if (retry < 3)
      return screenshot(headers, url, width, height, vpWidth, vpHeight, x, y, waitUntil, retry + 1)
    else
      throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
  } finally {
    if (page)
      await (page as Page).close()
  }
}

const pdf = async (headers: Record<string, string>, 
  url: string, 
  width: number, height: number, vpWidth: number, vpHeight: number, 
  waitUntil: WaitUntilOptions,
  format) => {
  let page: Page | null = null
  try {
    page = browser.newPage()
    if (!page)
      throw new Error('Couldn\'t create new page')
    
    page.setViewport({ width: vpWidth, height: vpHeight })

    await page.setExtraHTTPHeaders(headers)
    
    await page.goto(url, { waitUntil })
    
    let options: PDFOptions = {
      width: String(width),
      height: String(height)
    }

    return await page.pdf(options)
  } finally {
    if (page)
      page.close()
  }
}

interface RequestQuery {
  window: string,
  crop: string,
  x: string | number,
  y: string | number,
  waitUntil: WaitUntilOptions
}

const getProperitiesFrom = ({ window, crop, x, y, waitUntil } : RequestQuery) => {
  waitUntil = waitUntilOptions.includes(waitUntil) ? waitUntil : 'networkidle2'
  
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : DEFAULT_VIEWPORT
  
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  let [width, height] = crop ? crop.split('x').map(n => parseInt(n, 10)) : DEFAULT_CROP
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  x = x ? parseInt(x as string, 10) : DEFAULT_X
  y = y ? parseInt(y as string, 10) : DEFAULT_Y
  return { x, y, vpWidth, vpHeight, width, height, waitUntil }
} 

app.get('/png', async (req: Request, res: Response) => {
  let { url } = req.query

  if (!url)
    res.status(422)
      .send('need a url')
  
  const { x, y, vpWidth, vpHeight, width, height, waitUntil } = getProperitiesFrom(req.query)

  /**
   * pass through cookies, auth, etc. 
   * Using rawHeaders to ensure the values are strings
   * `req.headers` could have array values 
  */
  
  const headers: Record<string, string> = req.rawHeaders
    .reduce((prev, cur, i, array) =>
      i % 2 === 0 
      ? {...prev,
          [cur]: array[i + 1]
        }
      : prev
    , {})

  try {
    const picture = await screenshot(headers, url, width, height, vpWidth, vpHeight, x, y, waitUntil)
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
  const { x, y, vpWidth, vpHeight, width, height, waitUntil } = getProperitiesFrom(req.query)
  res.send('ok')
})

app.listen(port, () => console.log(`server listening on port ${port}`))
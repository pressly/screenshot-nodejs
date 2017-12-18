import * as express from 'express'
import { Request, Response } from 'express';
import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import Browser from './browser'
import { getProperitiesFromImg, getProperitiesFromPdf, isValidUrl, transformHeaders } from './requestHelper'

const NUM_BROWSERS = parseInt(process.argv[2], 10)

if (!NUM_BROWSERS)
  throw new Error('Need to specify a non zero NUM_BROWSERS')
  
/*
 * IMPORTANT - each browser is listening to process's "exit" event
 * this line allows more than the default 10 listeners / browsers open at a time
 */
 process.setMaxListeners(NUM_BROWSERS)

const browserOptions = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}

const browser = new Browser([...Array(NUM_BROWSERS)].map(_ => puppeteer.launch(browserOptions)))

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
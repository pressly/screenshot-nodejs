const express = require('express')
const puppeteer = require('puppeteer')
const app = express()
const port = 3000
const sleep = require('sleep-promise')

const browserOptions = Object.freeze({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
})

const NUM_BROWSERS     = parseInt(process.argv[2], 10)
const DEFAULT_VIEWPORT = [800, 600]
const DEFAULT_CROP     = [800, 600]
const DEFAULT_X        = 0
const DEFAULT_Y        = 0

const browser = {
  init(options) {
    if (!this._browsers)
      this._browsers = []
    for (let i = 0; i < NUM_BROWSERS; i++)
      this._browsers.push(puppeteer.launch(browserOptions).catch(console.log))
  },
  async cleanUp() {
    const browsers = await Promise.all(this._browsers)
    for (let browser of browsers) {
      const pages = await browser.pages()
      const length = pages.length 
      if (length > 2)
      pages.forEach((page, i) => {
        if (i < length - 1) // don't close the last page (could be in use)
          page.close()
      })
    }
    await sleep(1000)
    this.cleanUp() // tail call optimized 
  },
  async newPage(prevIndex = null) {
    if (!this._browsers)
      throw new Error(`No browsers`)

    let i
    if (prevIndex) {
      i = prevIndex
    } else {
      const numWaiting = await Promise.all(this._recalculateNumWaiting())
      i = numWaiting.indexOf(Math.min(...numWaiting))
    }

    const browser = await this._browsers[i]
    const pages = await browser.pages()

    if (pages.length <= 1) {
      return browser.newPage()
    } else if (pages.length === 2) { // browser already rendering a page
      await sleep(100)
      return this.newPage(i) // keep checking the same browser
    }
  },
  _recalculateNumWaiting() {
    return this._browsers.map(async (b) => {
      const browser = await b
      const pages = await browser.pages()
      return pages.length
    })
  }
}

browser.init(browserOptions)
browser.cleanUp()

const screenshot = async (headers, url, width, height, vpWidth, vpHeight, x, y) => {
  let page
  try { 
    page = await browser.newPage()
    await page.setViewport({ width: vpWidth, height: vpHeight })

    await page.setExtraHTTPHeaders(headers)

    await page.goto(url, { waitUntil: 'load' })

    let options = { fullpage: true }

    if (x && y && width && height)
      options = {
        clip: { x, y, width, height }
      }

    return await page.screenshot(options)    
  } finally {
    if (page)
      await page.close()
  }
}

const getProperitiesFrom = ({ window, crop, x, y }) => {
  let [vpWidth, vpHeight] = window ? window.split('x').map(n => parseInt(n, 10)) : []
  
  if (!vpWidth || !isFinite(vpWidth) || !vpHeight || !isFinite(vpHeight))
    [vpWidth, vpHeight] = DEFAULT_VIEWPORT

  let [width, height] = crop ? crop.split('x').map(n => parseInt(n, 10)) : []
  
  if (!width || !isFinite(width) || !height || !isFinite(height))
    [width, height] = DEFAULT_CROP

  x = x ? parseInt(x, 10) : DEFAULT_X
  y = y ? parseInt(y, 10) : DEFAULT_Y
  return { x, y, vpWidth, vpHeight, width, height }
} 


app.get('/png', (req, res) => {
  let { url } = req.query
  if (!url)
    res.status(422)
      .send('need a url')
  
  const { x, y, vpWidth, vpHeight, width, height } = getProperitiesFrom(req.query)

  /**
   * pass through cookies, auth, etc. 
   * Using rawHeaders to ensure the values are strings
   * `req.headers` could have array values 
  */
  const headers = req.rawHeaders.reduce((prev, cur, i, array) => {
    if (i % 2 === 0)
      return {...prev,
        [cur]: array[i + 1]
      }
    else
      return prev
  }, [])

  screenshot(headers, url, width, height, vpWidth, vpHeight, x, y)
    .catch(e => {
      res.status(500)
        .send(`Puppeteer Failed 
          - url: ${url} 
          - width: ${width} 
          - height: ${height} 
          - x: ${x} 
          - y: ${y} 
          - stacktrace: \n\n${e.stack}`)
    })
    .then(img => {
      res.set('Content-type', 'image/png').send(img)
    })
  
})

app.listen(port, () => console.log(`server listening on port ${port}`))
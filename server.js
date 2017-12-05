const express = require('express')
const puppeteer = require('puppeteer')
const app = express()
const port = 3000

const browserOptions = Object.freeze({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
})

const NUM_BROWSERS = parseInt(process.argv[2], 10)

const browser = {
  init(options) {
    if (!this._browsers)
      this._browsers = []
    this._inUse = -1
    for (let i = 0; i < NUM_BROWSERS; i++)
      this._browsers.push(puppeteer.launch(browserOptions).catch(console.log))
  },
  newPage() {
    this._inUse++
    if (this._inUse === NUM_BROWSERS)
      this._inUse = 0
    if (!this._browsers)
      return
    
    return this._browsers[this._inUse]
      .then(b => b.newPage())
  }
}

browser.init(browserOptions)

const screenshot = async (headers, url, width=800, height=600, x=0, y=0, vpWidth=1000, vpHeight=1000) => {
  let page
  try { 
    page = await browser.newPage()
    await page.setViewport({ width: vpWidth, height: vpHeight })

    await page.setExtraHTTPHeaders(headers)

    await page.goto(url, { waitUntil: 'networkidle2' })

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

app.get('/png', (req, res) => {
  let { url, width, height, x, y } = req.query
  if (!url)
    res.status(422)
      .send('need a url')
  width = parseInt(width, 10)
  height = parseInt(height, 10)
  x = parseInt(x, 10)
  y = parseInt(y, 10)

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

  let picture

  if (width && height && x && y)
    picture = screenshot(headers, url, width, height, x, y)
  else if (width && height)
    picture = screenshot(headers, url, width, height)
  else if (x && y)
    picture = screenshot(headers, url, 800, 600, x, y)
  else
    picture = screenshot(headers, url)
  picture
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
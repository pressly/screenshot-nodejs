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

const browserPromise = puppeteer.launch(options).catch(console.log)

const screenshot = async (headers, browserPromise, url, width=800, height=600, x=0, y=0) => {
  const browser = await browserPromise

  let page
  try { 
    page = await browser.newPage()
    await page.setViewport({ width, height })

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

app.get('/screenshot', (req, res) => {
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
    picture = screenshot(headers, browserPromise, url, width, height, x, y)
  else if (width && height)
    picture = screenshot(headers, browserPromise, url, width, height)
  else if (x && y)
    picture = screenshot(headers, browserPromise, url, 800, 600, x, y)
  
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
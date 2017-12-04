const express = require('express')
const puppeteer = require('puppeteer')
const app = express()
const port = 80

const browserOptions = Object.freeze({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
})

let retries = 0

let browser = puppeteer
  .launch(browserOptions)
  .catch(() => {
    // Assuming the browser crashed
    if (retries > 10)
      throw 'Chrome crashed more then 10 times'
    retries++
    if (browser)
      browser.then(b => {
        if (b) {
          b.close()
        }
        browser = puppeteer.launch(browserOptions)
      })
    else 
      browser = puppeteer.launch(browserOptions)
  })

app.get('/screenshot', (req, res) => {
  let { url, width, height, x, y } = req.query
  if (!url)
    res.status(422)
      .send('need a url')
  width = parseInt(width, 10)
  height = parseInt(height, 10)
  x = parseInt(x, 10)
  y = parseInt(y, 10)

  browser.then(async (browser) => {
    let page
    try { 
      page = await browser.newPage()
      /**
       * pass through cookies, auth, etc. 
       * Using rawHeaders to ensure the values are strings
       * `req.headers` could have array values 
      */
      const headers = req.rawHeaders.reduce((prev, cur, i, array) => {
        if (i % 2 == 0)
          return prev.concat([{
            [cur]: array[i + 1]
          }])
        else
          return prev
      }, [])

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
  })
  .catch(e =>
    res.status(500)
      .send(`Puppeteer Failed 
        - url: ${url} 
        - width: ${width} 
        - height: ${height} 
        - x: ${x} 
        - y: ${y} 
        - stacktrace: \n\n${e.stack}`)
  )
  .then(img => {
    res.set('Content-type', 'image/png').send(img)
  })
    
})

app.listen(port, () => console.log(`server listening on port ${port}`))
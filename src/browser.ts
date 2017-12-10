import { Browser, Page, ScreenshotOptions, Viewport, PDFOptions, LoadEvent, PDFFormat } from 'puppeteer'
import * as puppeteer from 'puppeteer'
import * as sleep from 'sleep-promise'

interface BrowserOptions {
  args: string[]
}

export default class BrowserProxy {
  readonly _browsers: Promise<Browser | void>[]
  readonly numBrowsers: number
  readonly options: BrowserOptions

  constructor(options: BrowserOptions, numBrowsers: number) {
    this._browsers = []
    this.options = options
    this.numBrowsers = numBrowsers

    for (let i = 0; i < numBrowsers; i++)
      this._browsers.push(puppeteer.launch(options).catch(console.log))

    this._startCleanUp()
  }

  async _startCleanUp() {
    while (true) {
      const browsers = await Promise.all<Browser | void>(this._browsers)
      browsers.forEach(async (browser, i) => {
        if (!browser) 
          this._browsers[i] = puppeteer.launch(this.options).catch(console.log)
        
        const pages = await (browser as Browser).pages()
        const length = pages.length
        if (length > 2)
          pages.forEach((page, i) => {
            if (i < length - 1) // don't close the last page (could be in use)
              page.close()
          })
      })
      await sleep(30 * 1000)
    }
  }

  async newPage(): Promise<Page> {
    const { browser, pages } = await this._getFreestBrowser()
    
    if (pages.length <= 1) {
      return browser.newPage()
    } else { // browser already rendering a page
      await sleep(50)
      return this.newPage()
    } 
  }

  async goto(page: Page, url: string, viewport: Viewport, headers: Record<string, string>, waitUntil: string) {
    if (!page)
      throw new Error('Couldn\'t create new page')
    
    await page.setViewport(viewport)
    await page.setExtraHTTPHeaders(headers)
    await page.goto(url, { waitUntil: waitUntil as LoadEvent })
  }

  async screenshot(headers: Record<string, string>, 
    url: string, 
    width: number, height: number, vpWidth: number, vpHeight: number, 
    x: number, y: number, waitUntil: string, retry = 0): Promise<Buffer | void> {
      let page: Page | undefined = undefined  
      try {
        page = await this.newPage()

        const viewport = {
          width: vpWidth, height: vpHeight
        }

        await this.goto(page, url, viewport, headers, waitUntil)

        let options: ScreenshotOptions = { fullPage: true }
    
        if (x && y && width && height)
          options = {
            clip: { x, y, width, height }
          }
        
        return await page.screenshot(options)   
      } catch (e) {
        if (page)
          await (page as Page).close()
        
        if (retry < 3)
          return this.screenshot(headers, url, width, height, vpWidth, vpHeight, x, y, waitUntil, retry + 1)
        else
          throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
      } finally {
        if (page)
          await (page as Page).close()
      }
  }

  async pdf(headers: Record<string, string>, 
    url: string, 
    width: number, height: number, vpWidth: number, vpHeight: number, 
    waitUntil: LoadEvent,
    format: PDFFormat | undefined, retry = 0): Promise<Buffer | void> {
    let page: Page | null = null
    try {
      page = await this.newPage()

      const viewport = {
        width: vpWidth, height: vpHeight
      }

      await this.goto(page, url, viewport, headers, waitUntil)

      let options: PDFOptions = {
        width: String(width),
        height: String(height)
      }
  
      if (format)
        options = { format }
  
      return await page.pdf(options)
    } catch (e) {
      if (page)
        await (page as Page).close()
      
      if (retry < 3)
        return this.pdf(headers, url, width, height, vpWidth, vpHeight, waitUntil, format, retry + 1)
      else
        throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
    } finally {
      if (page)
        (page as Page).close()
    }
  }

  async _getFreestBrowser(): Promise<{ browser: Browser, pages: Page[] }> {
    const browsers = await Promise.all<Browser | void>(this._browsers)
    
    const freestBrowser: {
      browser: Browser, pages: Page[]
    } = await browsers.reduce(async (prevBrowser, browser) => {
      const prev = await prevBrowser
      if (!browser)
        return prev // this is just to fix type issues, should never happen

      const pages = await browser.pages()

      
      if (Object.keys(prev).length === 0 || pages.length < prev.pages.length)
        return { pages, browser }
      else
        return prev

    }, Promise.resolve({}) as Promise<{ browser: Browser, pages: Page[] }>)
    return freestBrowser
  }
}

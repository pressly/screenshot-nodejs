import { Browser, Page, ScreenshotOptions, Viewport, PDFOptions, LoadEvent, PDFFormat } from 'puppeteer'
import * as puppeteer from 'puppeteer'
import * as sleep from 'sleep-promise'

interface BrowserOptions {
  args: string[]
}

export default class BrowserProxy {
  readonly _browsers: Promise<Browser>[]
  readonly numBrowsers: number
  readonly options: BrowserOptions

  constructor(options: BrowserOptions, numBrowsers: number) {
    // closest to list comprehension we can get in javascript hacky but works
    this._browsers = [...Array(numBrowsers)].map(_ => puppeteer.launch(options))
    this.options = options
    this.numBrowsers = numBrowsers
  }

  async newPage(): Promise<Page> {
    console.log('newpage')
    const { browser, pages } = await this._getFreestBrowser()
    
    if (pages.length <= 1) {
      return browser.newPage()
    } else { // browser already rendering a page
      console.log('here')
      if (pages.length > 2) { 
        // this should never happen
        throw new Error(`Too many pages open, possible memory leak - # of pages:${pages.length}`)
      }
      await sleep(50)
      return this.newPage()
    } 
  }

  async goto(page: Page, url: string, viewport: Viewport, headers: Record<string, string>, waitUntil: string): Promise<void> {
    console.log('goto')
    if (!page)
      throw new Error('Couldn\'t create new page')
    
    await page.setViewport(viewport)
    await page.setExtraHTTPHeaders(headers)
    await page.goto(url, { waitUntil: waitUntil as LoadEvent })
  }

  async screenshot(headers: Record<string, string>, url: string, options: ScreenshotOptions, viewport: Viewport, waitUntil: LoadEvent, retry = 0): Promise<Buffer> {
    console.log('screenshot')
    let page: Page | undefined = undefined  
    try {
      page = await this.newPage()
      console.log('got page')
      if (!options.clip)
        options = { fullPage: true }

      await this.goto(page, url, viewport, headers, waitUntil)

      return await page.screenshot(options)
    } catch (e) {
      if (page)
        await (page as Page).close()
      
      if (retry < 2)
        return this.screenshot(headers, url, options, viewport, waitUntil, retry + 1)
      else
        throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
    } finally {
      if (page)
        await (page as Page).close()
    }
  }

  async pdf(headers: Record<string, string>, url: string, viewport: Viewport, options: Partial<PDFOptions>, waitUntil: LoadEvent, retry = 0): Promise<Buffer> {
    let page: Page | undefined = undefined
    try {
      page = await this.newPage()

      await this.goto(page, url, viewport, headers, waitUntil)
  
      return await page.pdf(options)
    } catch (e) {
      if (page)
        await (page as Page).close()
      
      if (retry < 2)
        return this.pdf(headers, url, viewport, options, waitUntil, retry + 1)
      else
        throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
    } finally {
      if (page)
        (page as Page).close()
    }
  }

  async _getFreestBrowser(): Promise<{ browser: Browser, pages: Page[] }> {
    const browsers = await Promise.all<Browser>(this._browsers)
    
    const freestBrowser = await browsers.reduce(async (prevBrowser, browser) => {
      const prev = await prevBrowser
      const pages = await browser.pages()

      // if prev is the empty object
      return Object.keys(prev).length === 0 || pages.length < prev.pages.length
        ? { pages, browser }
        : prev

    }, Promise.resolve({}) as Promise<{ browser: Browser, pages: Page[] }>)
    return freestBrowser
  }
}
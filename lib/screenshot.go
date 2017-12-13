package screenshot

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	Conn    *http.Client
	BaseURL string
}

type Page struct {
	Headers   map[string]string
	Window    *[2]int // [x, y]
	Crop      *[2]int // [x, y] not applicable for Pdf
	WaitUntil string
	X         *int // so it can be nil
	Y         *int // ^
}

/* PdfOptions
 * see the following for more details
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
 */
type PdfOptions struct {
	Path                string
	Scale               *float32 // so it can be nil
	DisplayHeaderFooter bool
	PrintBackground     bool
	Landscape           bool
	PageRanges          string // example'1-5, 8, 11-13'
	Format              string
	Margin              Margin
}

type Margin struct {
	Top    string
	Right  string
	Bottom string
	Left   string
}

func New(BaseURL string) *Client {
	client := &Client{
		Conn: &http.Client{
			Timeout: time.Second * 10,
		},
		BaseURL: BaseURL,
	}

	return client
}

func (c *Client) Do(req *http.Request) (*http.Response, []byte, error) {
	resp, err := c.Conn.Do(req)
	if err != nil {
		return resp, nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return resp, nil, err
	}

	return resp, body, nil
}

func (c *Client) PNG(websiteURL string, page Page) (io.Reader, error) {
	queryParams, err := makeQueryParams(websiteURL, page, nil, nil)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/png?%s", c.BaseURL, queryParams)

	req, err := http.NewRequest("GET", u, nil)

	if page.Headers != nil {
		for key, value := range page.Headers {
			req.Header.Add(key, value)
		}
	}

	if err != nil {
		return nil, err
	}

	resp, body, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Couldn't take png screenshot")
	}
	reader := bytes.NewReader(body)

	return reader, nil
}

func (c *Client) JPEG(websiteURL string, page Page, quality int) (io.Reader, error) {
	extraParams := map[string]string{
		"jpegQuality": string(quality),
	}
	queryParams, err := makeQueryParams(websiteURL, page, nil, extraParams)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/jpeg?%s", c.BaseURL, queryParams)

	req, err := http.NewRequest("GET", u, nil)

	if page.Headers != nil {
		for key, value := range page.Headers {
			req.Header.Add(key, value)
		}
	}

	if err != nil {
		return nil, err
	}

	resp, body, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Couldn't take png screenshot")
	}
	reader := bytes.NewReader(body)

	return reader, nil
}

func (c *Client) PDF(websiteURL string, page Page, pdfOptions PdfOptions) (io.Reader, error) {
	queryParams, err := makeQueryParams(websiteURL, page, &pdfOptions, nil)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/pdf?%s", c.BaseURL, queryParams)

	req, err := http.NewRequest("GET", u, nil)

	if page.Headers != nil {
		for key, value := range page.Headers {
			req.Header.Add(key, value)
		}
	}

	if err != nil {
		return nil, err
	}

	resp, body, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Couldn't take png screenshot")
	}
	reader := bytes.NewReader(body)

	return reader, nil
}

func makeQueryParams(websiteURL string, page Page, pdf *PdfOptions, extraParams map[string]string) (string, error) {
	parsedURL, err := url.Parse(websiteURL)
	if err != nil {
		return "", errors.New("Need to provide a valid websiteURL")
	}

	// check if query is escaped
	q, err := isEscaped(parsedURL.RawQuery)
	if err != nil {
		return "", err
	}
	if q {
		parsedURL.RawQuery = url.QueryEscape(parsedURL.RawQuery)
	}

	u := fmt.Sprintf("url=%s", parsedURL.String())

	if page.Crop != nil && pdf == nil {
		if len(page.Crop) != 2 {
			return "", errors.New("Crop must be nil or of length 2")
		}
		u += fmt.Sprintf("&crop=%dx%d", page.Crop[0], page.Crop[1])
	}
	if page.Window != nil {
		if len(page.Window) != 2 {
			return "", errors.New("Window must be nil or of length 2")
		}
		u += fmt.Sprintf("&window=%dx%d", page.Window[0], page.Window[1])
	}

	if page.WaitUntil != "" {
		u += "&waituntil=" + page.WaitUntil
	}

	if page.X != nil && page.Y != nil && pdf == nil {
		u += fmt.Sprintf("&x=%d&y=%d", *page.X, *page.Y)
	}

	if pdf != nil {
		pdfOptions := *pdf
		u += fmt.Sprintf("&displayHeaderFooter=%t", pdfOptions.DisplayHeaderFooter)
		if pdfOptions.Format != "" {
			u += fmt.Sprintf("&format=%s", pdfOptions.Format)
		}
		u += fmt.Sprintf("&landscape=%t", pdfOptions.Landscape)
		u += fmt.Sprintf("&margin=top:%s;right:%s;bottom:%s;left:%s",
			pdfOptions.Margin.Top, pdfOptions.Margin.Right, pdfOptions.Margin.Bottom, pdfOptions.Margin.Left)
		if pdfOptions.PageRanges != "" {
			u += fmt.Sprintf("&pageRanges=%s", pdfOptions.PageRanges)
		}
		if pdfOptions.Path != "" {
			u += fmt.Sprintf("&path=%s", pdfOptions.Path)
		}
		if pdfOptions.Scale != nil {
			u += fmt.Sprintf("&scale=%f", *pdfOptions.Scale)
		}
	}

	if extraParams != nil {
		for key, value := range extraParams {
			u += fmt.Sprintf("&%s=%s", key, value)
		}
	}

	return u, nil
}

func isEscaped(str string) (bool, error) {
	s, err := url.QueryUnescape(str)
	if err != nil {
		return false, errors.New("can't unescape given string")
	}
	return s == str, nil
}

package screenshot

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

func makePdfRequest(baseURL string, websiteURL string, opts PdfOptions) (*http.Request, error) {
	queryParams, err := makePdfQueryParams(websiteURL, opts)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/pdf?%s", baseURL, queryParams)

	return http.NewRequest("GET", u, nil)
}

func makePdfQueryParams(websiteURL string, opts PdfOptions) (string, error) {
	parsedURL, err := url.Parse(websiteURL)
	if err != nil {
		return "", errors.New("Need to provide a valid websiteURL")
	}

	// check if query is escaped - can't error out since coming from legit url
	s, _ := url.QueryUnescape(parsedURL.RawQuery)
	if s == parsedURL.RawQuery {
		parsedURL.RawQuery = url.QueryEscape(parsedURL.RawQuery)
	}

	u := fmt.Sprintf("url=%s", parsedURL.String())

	if opts.Window != nil {
		if len(opts.Window) != 2 {
			return "", errors.New("Window must be nil or of length 2")
		}
		u += fmt.Sprintf("&window=%dx%d", opts.Window[0], opts.Window[1])
	}

	if opts.WaitUntil != "" {
		u += "&waituntil=" + opts.WaitUntil
	}

	u += fmt.Sprintf("&displayHeaderFooter=%t", opts.DisplayHeaderFooter)
	if opts.Format != "" {
		u += fmt.Sprintf("&format=%s", opts.Format)
	}
	u += fmt.Sprintf("&landscape=%t", opts.Landscape)
	u += fmt.Sprintf("&margin=top:%s;right:%s;bottom:%s;left:%s",
		opts.Margin.Top, opts.Margin.Right, opts.Margin.Bottom, opts.Margin.Left)
	if opts.PageRanges != "" {
		u += fmt.Sprintf("&pageRanges=%s", opts.PageRanges)
	}
	if opts.Path != "" {
		u += fmt.Sprintf("&path=%s", opts.Path)
	}
	if opts.Scale != nil {
		u += fmt.Sprintf("&scale=%f", *opts.Scale)
	}

	return u, nil
}

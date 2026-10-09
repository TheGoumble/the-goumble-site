# The Goumble

Source for [thegoumble.com](https://thegoumble.com), the portfolio of Javier Andres Vargas.
Plain HTML, CSS and JavaScript with hand-drawn SVG art. There is no framework and no build step.

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | The main page: hero, about, projects, resume, contact |
| `contact.html` | The contact page (form and delivery animation) |
| `404.html` | Shown for unknown URLs |
| `data.json` | All the text content: bio, projects, skills, nav, social links |
| `css/` | One stylesheet per section, plus `variables.css` for colours and fonts |
| `js/` | One script per feature (`starfield`, `tether`, `eyes`, `nav`, `field`, `contactpage` ...) |
| `assets/` | Art, icons, headshot and `resume.pdf` |

Edit text in `data.json`; most of the page is filled from it.

## Run locally

Any static server works. The page loads `data.json` with `fetch`, so opening the file directly will not work.

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Contact form

The form posts to [Web3Forms](https://web3forms.com). Put the access key in the `data-access-key`
attribute of the form in `contact.html`. It is a public key by design, so it is safe to commit.
While it is still `YOUR_ACCESS_KEY_HERE` the form runs in demo mode and sends nothing.

## Deploy

Pushing to `main` on GitHub deploys to Cloudflare Workers (static assets). `wrangler.jsonc` sets the
asset folder, and `.assetsignore` keeps repo files such as this README out of the deployed site.

# karpathy.ai — Style Cloning Spec

> Analysis → Plan → Spec for replicating karpathy.ai using pure HTML + CSS. No frameworks.

---

## Analysis

### Visual Identity

- **Philosophy**: Brutalist minimalism. Zero decoration. Content is the UI.
- **Background**: Pure white `#fff`
- **Text color**: Soft near-black `#333` — not pure black
- **Accent**: Default hyperlink blue `#0066cc`
- No rounded corners, no shadows, no cards, no gradients

### Layout

- Single centered column
- `max-width: 720px`, centered with `margin: 0 auto`
- `padding: 0 20px` on sides for mobile safety
- Everything stacks vertically — except the talks thumbnail grid
- No CSS frameworks, no JS, two static files total

### Typography

- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Base size: `16px`
- Line height: `1.7` — generous, readable
- `h1`: `2rem`, bold — the name
- `h2.tagline`: `1.1rem`, normal weight, muted color
- Section labels: `0.85rem`, `#999`, lowercase, slight letter-spacing

### Structural Sections (top to bottom)

1. Profile photo + name + tagline + social icons
2. `<hr>` divider
3. Unicorn joke paragraph (plain text)
4. Timeline — year ranges with company logos + paragraphs
5. Bio
6. Featured talks — image thumbnail grid
7. Teaching
8. Featured writing — dated bullet list
9. Pet projects — image + description pairs
10. Publications — plain structured list
11. Misc unsorted — bullet list

### Component Notes

- **Profile photo**: `150px` circle via `border-radius: 50%`
- **Social icons**: SVG images in a flex row, `28px`, no labels
- **Company logos**: `height: 44px`, `object-fit: contain`, block-displayed above paragraphs
- **Talks grid**: 4-column CSS grid, `aspect-ratio: 16/9` thumbnails, collapses to 2-col on mobile
- **Writing list**: `<ul>` with no list-style, date prepended as muted `<span>`
- **Pet projects**: `<img>` block above `<p>`, max-width ~460px
- **Publications**: title + venue + authors as stacked `<span>` elements

---

## Plan

**Files**: `index.html` + `style.css` — nothing else.

**Rules**:
- Semantic HTML5 only (`section`, `hr`, `ul`, `a`, `img`)
- CSS under ~150 lines
- Responsive via `max-width` + `padding` + one `@media` breakpoint for the grid
- Zero JavaScript
- Placeholder images via `https://placehold.co` or local `assets/` paths

---

## Spec

### `style.css`

```css
/* ── Reset & Base ── */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #333;
  background: #fff;
  padding: 40px 20px;
}

/* ── Container ── */
.container {
  max-width: 720px;
  margin: 0 auto;
}

/* ── Header ── */
.profile-photo {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: block;
  margin-bottom: 16px;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: #111;
}

h2.tagline {
  font-size: 1.1rem;
  font-weight: 400;
  color: #555;
  margin-bottom: 16px;
}

/* ── Social Icons ── */
.social-icons {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}

.social-icons img {
  width: 28px;
  height: 28px;
  opacity: 0.75;
  transition: opacity 0.15s;
}

.social-icons img:hover {
  opacity: 1;
}

/* ── Divider ── */
hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 32px 0;
}

/* ── Body Text ── */
p {
  margin-bottom: 16px;
  color: #333;
}

a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* ── Section Labels ── */
.section-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: lowercase;
  letter-spacing: 0.05em;
  color: #999;
  margin-bottom: 12px;
  margin-top: 32px;
}

/* ── Timeline Eras ── */
.era {
  margin-bottom: 36px;
}

.era .year-range {
  font-size: 0.9rem;
  font-weight: 600;
  color: #999;
  margin-bottom: 10px;
}

.era .company-logo {
  height: 44px;
  width: auto;
  display: block;
  margin-bottom: 12px;
  object-fit: contain;
}

/* ── Featured Talks Grid ── */
.talks-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.talks-grid a {
  display: block;
}

.talks-grid img {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

/* ── Writing List ── */
.writing-list {
  list-style: none;
  padding: 0;
}

.writing-list li {
  margin-bottom: 6px;
  font-size: 0.95rem;
}

.writing-list li .date {
  color: #999;
  font-size: 0.85rem;
  margin-right: 8px;
}

/* ── Pet Projects ── */
.project {
  margin-bottom: 32px;
}

.project img {
  width: 100%;
  max-width: 460px;
  height: auto;
  display: block;
  margin-bottom: 10px;
}

/* ── Publications ── */
.publication {
  margin-bottom: 20px;
}

.publication .pub-title {
  font-weight: 600;
  display: block;
  margin-bottom: 2px;
}

.publication .pub-venue {
  font-size: 0.85rem;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.publication .pub-authors {
  font-size: 0.9rem;
  color: #555;
}

/* ── Misc List ── */
.misc-list {
  padding-left: 20px;
}

.misc-list li {
  margin-bottom: 8px;
  font-size: 0.95rem;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .talks-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  h1 {
    font-size: 1.5rem;
  }
}
```

---

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Andrej Karpathy</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <img class="profile-photo" src="assets/me_new.jpg" alt="Andrej Karpathy" />
  <h1>Andrej Karpathy</h1>
  <h2 class="tagline">I like to train deep neural nets on large datasets 🧠🤖💥</h2>

  <div class="social-icons">
    <a href="https://twitter.com/karpathy"><img src="assets/ctwitter.svg" alt="Twitter" /></a>
    <a href="https://github.com/karpathy"><img src="assets/cgithub.svg" alt="GitHub" /></a>
    <a href="https://karpathy.github.io"><img src="assets/crss.svg" alt="Blog" /></a>
    <img src="assets/cemail.svg" alt="Email" title="click to reveal" />
  </div>

  <hr />

  <!-- UNICORN -->
  <p>It is important to note that Andrej Karpathy is a member of the Order of the Unicorn...</p>

  <hr />

  <!-- TIMELINE -->
  <div class="era">
    <div class="year-range">2024 –</div>
    <img class="company-logo" src="assets/eureka.png" alt="Eureka Labs" />
    <p>I am founder at <a href="https://eurekalabs.ai/">Eureka Labs</a>. I recently elaborated
    on its vision on the <a href="...">Dwarkesh podcast</a>.</p>
  </div>

  <div class="era">
    <div class="year-range">2023 – 2024</div>
    <img class="company-logo" src="assets/openai_logo.png" alt="OpenAI" />
    <p>I came back to <a href="https://openai.com/">OpenAI</a> where I built a new team
    working on midtraining and synthetic data generation.</p>
  </div>

  <div class="era">
    <div class="year-range">2017 – 2022</div>
    <img class="company-logo" src="assets/tesla_logo2.jpg" alt="Tesla" />
    <p>I was the <a href="...">Director of AI at Tesla</a>, where I led the computer vision
    team of Tesla Autopilot.</p>
  </div>

  <div class="era">
    <div class="year-range">2015 – 2017</div>
    <img class="company-logo" src="assets/openai_logo.png" alt="OpenAI" />
    <p>I was a research scientist and founding member at <a href="...">OpenAI</a>.</p>
  </div>

  <div class="era">
    <div class="year-range">2011 – 2015</div>
    <img class="company-logo" src="assets/stanford_logo.png" alt="Stanford" />
    <p>My PhD was focused on convolutional/recurrent neural networks. Adviser:
    <a href="...">Fei-Fei Li</a>.</p>
  </div>

  <div class="era">
    <div class="year-range">2009 – 2011</div>
    <img class="company-logo" src="assets/ubc_logo.png" alt="UBC" />
    <p>MSc at the University of British Columbia.</p>
  </div>

  <div class="era">
    <div class="year-range">2005 – 2009</div>
    <img class="company-logo" src="assets/uoft_logo.png" alt="University of Toronto" />
    <p>BSc at the University of Toronto, double major in CS and physics.</p>
  </div>

  <hr />

  <!-- BIO -->
  <div class="section-label">bio</div>
  <p>Andrej Karpathy is an AI researcher and founder of Eureka Labs, focused on
  modernizing education in the age of AI.</p>

  <hr />

  <!-- FEATURED TALKS -->
  <div class="section-label">featured talks</div>
  <div class="talks-grid">
    <a href="https://www.youtube.com/watch?v=lXUZvyajciY">
      <img src="assets/dwarkesh_pod.jpg" alt="Dwarkesh podcast 2025" />
    </a>
    <a href="https://www.youtube.com/watch?v=LCEmiRjPEtQ">
      <img src="assets/yc.jpg" alt="YC AI Startup School 2025" />
    </a>
    <a href="https://www.youtube.com/watch?v=FH5wiwOyPX4">
      <img src="assets/gpumode_talk_2024.jpg" alt="GPU Mode 2024" />
    </a>
    <a href="https://www.youtube.com/watch?v=hM_h0UA7upI">
      <img src="assets/nopriors.jpg" alt="No Priors podcast 2024" />
    </a>
    <!-- add more rows as needed -->
  </div>

  <hr />

  <!-- TEACHING -->
  <div class="section-label">teaching</div>
  <p>I have a <a href="https://www.youtube.com/@AndrejKarpathy">YouTube channel</a> where I
  post lectures on LLMs and AI.</p>
  <p>In 2015 I designed and was the primary instructor for
  <a href="http://cs231n.stanford.edu/">CS 231n</a> at Stanford.</p>
  <ul class="misc-list">
    <li><a href="...">2016 lecture videos</a></li>
    <li><a href="...">course notes</a></li>
    <li><a href="...">course syllabus</a></li>
  </ul>

  <hr />

  <!-- FEATURED WRITING -->
  <div class="section-label">featured writing</div>
  <ul class="writing-list">
    <li><span class="date">Mar 2021</span><a href="...">A from-scratch tour of Bitcoin in Python</a></li>
    <li><span class="date">Jun 2020</span><a href="...">Biohacking Lite</a></li>
    <li><span class="date">Apr 2019</span><a href="...">A Recipe for Training Neural Networks</a></li>
    <li><span class="date">Nov 2017</span><a href="...">Software 2.0</a></li>
    <li><span class="date">Sep 2016</span><a href="...">A Survival Guide to a PhD</a></li>
    <li><span class="date">May 2015</span><a href="...">The Unreasonable Effectiveness of Recurrent Neural Networks</a></li>
  </ul>

  <hr />

  <!-- PET PROJECTS -->
  <div class="section-label">pet projects</div>

  <div class="project">
    <img src="assets/puppy.jpg" alt="micrograd" />
    <p><a href="https://github.com/karpathy/micrograd">micrograd</a> is a tiny scalar-valued
    autograd engine implementing backpropagation over a dynamically built DAG.</p>
  </div>

  <div class="project">
    <img src="assets/charseq.jpeg" alt="char-rnn" />
    <p><a href="https://github.com/karpathy/char-rnn">char-rnn</a> was a Torch
    character-level language model built out of LSTMs/GRUs/RNNs.</p>
  </div>

  <div class="project">
    <img src="assets/arxiv_sanity.jpg" alt="arxiv-sanity" />
    <p><a href="https://github.com/karpathy/arxiv-sanity-preserver">arxiv-sanity</a> tames
    the overwhelming flood of papers on Arxiv.</p>
  </div>

  <hr />

  <!-- PUBLICATIONS -->
  <div class="section-label">publications</div>

  <div class="publication">
    <span class="pub-title">
      <a href="...">World of Bits: An Open-Domain Platform for Web-Based Agents</a>
    </span>
    <span class="pub-venue">ICML 2017</span>
    <span class="pub-authors">Tianlin (Tim) Shi, Andrej Karpathy, Linxi (Jim) Fan, ...</span>
  </div>

  <div class="publication">
    <span class="pub-title">
      <a href="...">Connecting Images and Natural Language (PhD thesis)</a>
    </span>
    <span class="pub-venue">2016</span>
    <span class="pub-authors">Andrej Karpathy</span>
  </div>

  <!-- add remaining publications ... -->

  <hr />

  <!-- MISC -->
  <div class="section-label">misc unsorted</div>
  <ul class="misc-list">
    <li><a href="...">Neural Networks: Zero To Hero lecture series</a></li>
    <li>My <a href="...">first blog</a>, <a href="...">second blog</a>, and <a href="...">current blog</a>.</li>
    <li>I like sci-fi. Sorted sci-fi books I've read <a href="...">here</a>.</li>
    <li><a href="...">Loss function Tumblr</a> :D</li>
    <li>0 frameworks were used to make this website. Pure HTML and CSS.</li>
  </ul>

</div>
</body>
</html>
```

---

## Reference Table

| Property | Value |
|---|---|
| Body font | `-apple-system` system stack |
| Base size | `16px` |
| Line height | `1.7` |
| Max width | `720px` centered |
| Body padding | `40px 20px` |
| Text color | `#333` |
| Heading color | `#111` |
| Muted color | `#999` |
| Link color | `#0066cc` |
| Divider | `1px solid #e0e0e0` |
| Profile photo | `150px`, `border-radius: 50%` |
| Section label size | `0.85rem` |
| Company logo height | `44px` |
| Talks grid | 4-col → 2-col at `600px` |
| Shadows | none |
| Borders on images | none |
| Cards | none |
| JavaScript | none |

---

> The entire vibe is: *"a researcher wrote this in an afternoon and it's perfect."*
> Resist the urge to add anything. The restraint is the style.

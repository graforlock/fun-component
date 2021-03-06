/* globals mapboxgl */
/* eslint-env es6 */

const html = require('bel')
const morph = require('nanomorph')
const component = require('fun-component')
const cache = require('fun-component/cache')

const MAPBOX_TOKEN = 'pk.eyJ1IjoidG9ybnF2aXN0IiwiYSI6ImNqN2RjZHpmbTA1cjIzM3BmaGpkZnQxNHEifQ.ZSG3Gi0X-8Fane8_u9LdeQ'
const MAPBOX_URL = 'https://api.mapbox.com/mapbox-gl-js/v0.39.1/mapbox-gl.js'
const INITIAL_STATE = {
  lng: 18.0704503,
  lat: 59.3244897,
  error: null,
  positioned: false,
  isLoading: false,
  href: window.location.pathname
}

/**
 * Create Mapbox container component
 */

const mapbox = component(function mapbox () {
  return html`
    <div class="Map-container" onload=${load} onunload=${unload} onupdate=${update}>
    </div>
  `
})

/**
 * Use the cache plugin with our component
 */

mapbox.use(cache())

/**
 * Determine whether to update map location and place popup
 * @param {component.Context} ctx
 * @param {array} args List of latest arguments used to render component
 * @param {array} prev List of previous arguments used to render component
 * @returns {boolean} Always prevent component from rerendering
 */

function update (ctx, args, prev) {
  if (!ctx.map) { return false }

  if (args.reduce((changed, arg, i) => changed || arg !== prev[i], false)) {
    const [ lng, lat, positioned ] = args

    ctx.map.panTo([lng, lat])

    if (positioned) {
      ctx.popup
        .setLngLat([lng, lat])
        .setText('You are here')
        .addTo(ctx.map)
    } else if (ctx.popup.isOpen()) {
      ctx.popup.remove()
    }
  }

  return false
}

/**
 * If the map hasn't been initialized already, load Mapbox and create map
 * @param {component.Context} ctx
 * @param {number} lng
 * @param {number} lat
 * @param {boolean} positioned
 * @param {function} loading
 */

function load (ctx, lng, lat, positioned, loading) {
  if (ctx.map) {
    ctx.map.resize()
  } else {
    const script = html`<script src="${MAPBOX_URL}"></script>`

    loading(true)

    script.onload = () => {
      mapboxgl.accessToken = MAPBOX_TOKEN
      ctx.map = new mapboxgl.Map({
        container: ctx.element,
        center: [lng, lat],
        zoom: 11,
        style: 'mapbox://styles/tornqvist/cj8zu6vbvc0i62rn6oxb7gfyb'
      })

      ctx.popup = new mapboxgl.Popup({
        closeOnClick: false,
        closeButton: false
      })

      ctx.map.on('load', () => loading(false))
    }

    document.head.appendChild(script)
  }
}

/**
 * Remove the popup when unmounting the map
 */

function unload (ctx) {
  if (ctx.popup.isOpen()) {
    ctx.popup.remove()
  }
}

const about = component(function page () {
  return html`
    <article class="Text">
      <h1>Mapbox Example – fun-component</h1>
      <p>This page is for illustrating that if you go back to the map, it has been cached and does not need to initialize the Mapbox instance again upon mounting in the DOM.</p>
      <p>This is an example implementation of Mapbox using <a href="https://github.com/tornqvist/fun-component">fun-component</a>, a performant component encapsulated as a function.</p>
    </article>
  `
})

/**
 * Set up history routing handlers
 */

window.history.replaceState(INITIAL_STATE, document.title, window.location.pathname)
window.onpopstate = event => morph(document.body, view(event.state))

/**
 * Mount app in DOM
 */

morph(document.body, view(INITIAL_STATE))

/**
 * Main view, nothing special, really
 */

function view (state = {}) {
  return html`
    <body class="App">
      <div class="Error">${state.error}</div>
      <nav class="Menu">
        <a class="Menu-item ${state.href === '/' ? 'is-active' : ''}" onclick=${navigate} href="/">Map</a>
        <a class="Menu-item ${state.href === '/about' ? 'is-active' : ''}" onclick=${navigate} href="/about">About</a>
      </nav>
      ${state.href === '/' ? html`
        <div class="Map">
          ${mapbox(state.lng, state.lat, state.positioned, loading)}
          <button disabled=${state.isLoading} onclick=${locate} class="Button">Where am I?</button>
        </div>
      ` : about()}
    </body>
  `

  /**
   * Toggle loading state of application
   * @param {boolean} isLoading
   */

  function loading (isLoading) {
    morph(document.body, view(Object.assign({}, state, { isLoading })))
  }

  /**
   * Handle navigating between views
   * @param {object} event
   */

  function navigate (event) {
    const href = event.target.pathname
    const next = Object.assign({}, state, { href })
    window.history.pushState(next, document.title, href)
    morph(document.body, view(next))
    event.preventDefault()
  }

  /**
   * Find user location
   */

  function locate () {
    morph(document.body, view(Object.assign({}, state, { isLoading: true })))
    navigator.geolocation.getCurrentPosition(
      (position) => morph(document.body, view(Object.assign({}, state, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        error: null,
        positioned: true
      }))),
      err => morph(document.body, view(Object.assign({}, state, {
        error: err.message,
        positioned: false
      })))
    )
  }
}

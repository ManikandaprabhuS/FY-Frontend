import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preload } from 'react-dom'
import heroPalm from './assets/hero-palm.webp'
import './index.css'
import App from './App.tsx'
import {startHomepageBanner} from './store/homepageBannerStore'
import { siteMediaService } from './services/site-media.service'
import { HERO_VIDEO_POSTER } from './features/customer/data/heroVideoMedia'
// Start the initial Home image before its lazy route mounts; never fetch it for other entry routes.
if (window.location.pathname === '/') {
  preload(heroPalm, { as: 'image', fetchPriority: 'high' })
  preload(HERO_VIDEO_POSTER, { as: 'image', fetchPriority: 'high' })
  void siteMediaService.getHeroVideo().catch(() => undefined)
}
startHomepageBanner()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

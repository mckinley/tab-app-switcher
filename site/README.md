# Tab Application Switcher - Website

Marketing website with live demo of the Tab Application Switcher. Built with Vite and React.

## Development

```bash
npm run dev     # Start dev server
npm run build   # Build for production
npm run preview # Preview production build
```

## Deployment

The site is deployed to Vercel and auto-deploys on push to `main`.

### Vercel Configuration

- **Root Directory**: `site`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Manual Deployment

For other platforms (Netlify, Cloudflare Pages, etc.):

1. Set root/base directory to `site/`
2. Build command: `npm run build`
3. Deploy the `dist/` folder

## Structure

```
site/
├── pages/           # Page components
├── components/      # Site-specific components
├── App.tsx          # Main app with routing
└── main.tsx         # Entry point
```

The site imports shared components from `tas/` for the live demo.


# Live Map Systems

A real-time interactive mapping application built with Next.js, TypeScript, and OpenStreetMap.

## Features

- 🗺️ Interactive maps powered by OpenStreetMap and Leaflet
- ⚡ Real-time marker updates and live tracking
- 🎨 Beautiful UI with Shadcn/UI, Radix UI, and Headless UI
- 📱 Fully responsive design
- 🌓 Dark mode support
- 📍 Location search and geocoding
- 📊 Dashboard with analytics and statistics
- 🔄 Live data updates with configurable intervals

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3
- **UI Components:** 
  - Shadcn/UI
  - Radix UI Primitives
  - Headless UI
- **Maps:** Leaflet with React-Leaflet
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd live-map-systems
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
live-map-systems/
├── app/
│   ├── dashboard/       # Dashboard page
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page with live map
├── components/
│   ├── map/
│   │   ├── DynamicMap.tsx      # SSR-safe map wrapper
│   │   ├── LiveMapView.tsx     # Live map with controls
│   │   ├── MapContainer.tsx    # Core map component
│   │   └── MapControls.tsx     # Map control buttons
│   └── ui/              # Shadcn UI components
├── lib/
│   └── utils.ts         # Utility functions
└── public/
    └── leaflet/         # Leaflet marker icons
```

## Available Routes

- `/` - Main live map view
- `/dashboard` - Dashboard with map analytics

## Key Components

### LiveMapView
The main map component with live updates, controls, and status indicators.

### MapControls
Provides zoom, search, location, and layer switching controls.

### Dashboard
Analytics dashboard with multiple map views and statistics.

## Customization

### Adding New Markers
```typescript
const markers = [
  {
    id: 'unique-id',
    position: [latitude, longitude],
    popup: 'Marker description'
  }
];
```

### Configuring Live Updates
Adjust the `liveUpdateInterval` prop in LiveMapView (default: 5000ms).

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

MIT

# Frontend: Client-Side Architecture, Routing, and UI/UX Philosophy

## Setup & Start Instructions
Follow these steps to initialize the frontend environment and start the development server.

1. **Install Dependencies:**
   Navigate to the `/frontend` directory and install the necessary npm packages:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Development Server:**
   Run the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be accessible locally, typically at `http://localhost:3000`.

## Edge Proxy
The frontend utilizes an Edge Proxy (`src/proxy.js`) designed to handle MSaaS white-labeling bypass for Master Control Plane domains, preventing Next.js middleware from firing unnecessarily on static files.

## Testing Conventions
Frontend Unit testing leverages Node.js's native test runner (`node:test`) and `node:assert` due to environment network restrictions preventing external dependency installation.
- Tests are stored as `.test.mjs` files (e.g., `src/services/api.test.mjs`) to support ES module syntax.
- Tests are executed via `npm test`.

## Current Routing State
The frontend leverages the Next.js App Router to deliver a seamless, globally available structure.

- **Global Public Directory (`app/page.js`):** The landing page serving as a unified directory for all public events available on the MSaaS platform.
- **Control Plane (`app/admin/events/...`):** The administrative dashboard for the deployment, configuration, and editing of events.
- **Public Event Hub (`app/[eventSlug]/page.js`):** Dynamically generated, standalone pages for each individual event.

## GPU Optimizations Achieved
To realize our ultra-premium, cinematic aesthetic, performance is critical. We've optimized the frontend for hardware acceleration, offloading complex tasks to the GPU.

- **Eliminated Moving CSS Gaussian Blurs:** By removing computationally expensive CSS blurs, we significantly improved rendering performance and reduced jank during scrolling and transitions.
- **Concurrent Z-Index Fading:** We've implemented advanced z-index fading techniques for slideshows, allowing for smooth, visually stunning crossfades without layout thrashing.
- **`next/image` Compression:** Extensive use of Next.js's built-in image optimization ensures assets are served efficiently, minimizing load times without compromising visual fidelity.

## Animation Architecture
Our animation architecture is built entirely around Framer Motion, enabling complex, layout-aware animations that feel responsive and fluid.

- **Framer Motion Layout Transitions:** Utilizing `<AnimatePresence mode="popLayout">`, we achieve elegant entry and exit animations for components, maintaining a consistent, high-end feel as the UI state changes.
- **Bento Grid Layouts:** We employ bento grid structures to present information cleanly and hierarchically, often paired with subtle hover states and entry animations to create an engaging experience.
- **Ambient Aurora (`components/ui/ambient-aurora.js`):** A custom, hardware-accelerated, zero-blur radial gradient component that serves as the cinematic backdrop for our dark-mode aesthetic. This component provides dynamic, visually arresting backgrounds without the performance overhead of traditional CSS blurs.

## Security Practices
- **CSS/Style Injection:** Avoid using `dangerouslySetInnerHTML` for CSS/style injection to prevent XSS. Prefer defining global utility classes in `globals.css` and toggling them on the root element (`document.documentElement`) via React's `useEffect` hook.

## Socket Architecture
- **Presence Broadcasting:** Socket presence broadcasting is triggered by the `join_abyss` event. In React components, this emission should be isolated in a `useEffect` hook dependent only on `[socket, isConnected]` to prevent redundant broadcasts during internal state changes (e.g., switching active chats).

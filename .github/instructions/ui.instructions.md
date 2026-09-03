---
description: 'Central UI strategy and component development philosophy'
---

# UI Component Strategy

This file defines the central UI development strategy for Tailspin Toys. Technology-specific guidance is in separate instruction files.

## Component Architecture

### Technology Separation

- **Astro** (`.astro` files): Pages, layouts, components, routing, and static content. The site is fully prerendered (`output: 'static'`), so components render to HTML at build time.
- **Tailwind CSS** (utility classes): Styling
- **Astro `<script>`**: Reach for a small client-side script only when genuine interactivity is required — there is no client-side UI framework.

Refer to technology-specific instruction files:
- [`astro.instructions.md`](astro.instructions.md) - Astro pages, layouts, and components
- [`style.instructions.md`](style.instructions.md) - Tailwind CSS styling patterns

## Core Principles

### Testability

- Every interactive element MUST include a `data-testid` attribute
- Use descriptive test IDs that identify the element's purpose and context
- Examples: `data-testid="game-card-{game.id}"`, `data-testid="submit-button"`, `data-testid="nav-home"`

### Accessibility

- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<button>`)
- Provide ARIA labels and roles where semantic HTML isn't sufficient
- Use plain `<nav>` with `<a>`/`<button>` elements for site navigation — do **not** add `role="menu"`. Reserve `role="menu"` / `role="menuitem"` for true application-style menus that implement full composite keyboard semantics (arrow-key roving focus, Home/End, type-ahead)
- Loading states should use `role="status"` and `aria-live="polite"` for screen reader announcements
- Include Escape key handlers for dismissible elements (menus, modals)
- Ensure keyboard navigation works for all interactive elements, with proper focus management
- Include visible focus states: `focus:ring-2 focus:ring-blue-500 focus:outline-none`
- Maintain sufficient color contrast (especially in dark theme)

### Design Consistency

- Dark theme throughout the application
- Modern, clean UI with rounded corners and smooth transitions
- Consistent spacing and visual hierarchy
- Responsive design that works on mobile, tablet, and desktop

### Component Reusability

- Create reusable components for common UI patterns
- Keep components focused on a single responsibility
- Use props for configuration, not duplication
- Document component APIs with TypeScript types

## Coding Standards

### Comment Philosophy

Comments should **explain intent and reasoning**, not restate code. Follow these guidelines:

- **Comment why, not what**: Explain non-obvious decisions, assumptions, or the reasoning behind the code — not what the code already says.
- **Avoid redundant comments**: Do not add comments that merely paraphrase the line below. Remove them.
- **Example of bad commenting**:
  ```ts
  // loop through games
  for (const game of games) {
    // check if game exists
    if (game) {
      // add to list
      list.push(game);
    }
  }
  ```
- **Example of good commenting**:
  ```ts
  // Filter out null entries that may occur from concurrent deletes
  for (const game of games) {
    if (game) {
      list.push(game);
    }
  }
  ```
- **Keep comments current**: Treat outdated or incorrect comments as bugs. Update or delete them in the same change that modifies the related code.

### Documentation Requirements

#### Data Layer (db/ and src/lib/)

Every exported function must have a **TSDoc/JSDoc** comment describing:
- **Purpose**: What the function does
- **Parameters**: Each parameter with its type and meaning
- **Return value**: What is returned and when (e.g., null for not found)

Example:
```ts
/**
 * Retrieves all games ordered by title.
 * @param db The database client instance
 * @returns Promise resolving to an array of games sorted alphabetically by title
 */
export async function getAllGames(db: Database): Promise<Game[]> {
  // ...
}

/**
 * Retrieves a single game by ID.
 * @param db The database client instance (injectable for testing)
 * @param id The game's numeric ID
 * @returns Promise resolving to the Game if found, null otherwise
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
  // ...
}
```

Keep the injectable `db` argument documented so the testing pattern stays clear.

#### Astro Components

Every reusable `.astro` component must document its **Props interface**:

```astro
---
/**
 * Reusable button component supporting multiple styles and sizes.
 */
interface Props {
  /** Visual style of the button ('solid' or 'gradient'). */
  variant?: 'solid' | 'gradient';
  /** Padding scale ('sm' or 'md'). */
  size?: 'sm' | 'md';
  /** When provided, renders an anchor element instead of a button. */
  href?: string;
  /** Button type when rendered as a button element. */
  type?: 'button' | 'submit' | 'reset';
  /** Stretch the button to fill its container. */
  fullWidth?: boolean;
}

const { variant = 'solid', size = 'md', href, type = 'button', fullWidth = false } = Astro.props;
---

<!-- Component template -->
```

### TypeScript Formatting Rules

- Use **explicit types** for function parameters and return values, especially in the data layer (`db/`, `src/lib/`)
- Imports and exports must be clearly typed — avoid implicit `any`
- Use semantic type names: `Game`, `Publisher`, `Category`, `Database`
- Complex types should be declared in `src/types/` and reused across the codebase
- Type annotations help Copilot and other tooling understand intent, making code easier to maintain

## Development Workflow

1. **Choose the right tool**: 
   - Content & structure → Astro components/pages
   - Styling → Tailwind
   - Client interactivity (rare) → a scoped Astro `<script>`

2. **Follow technology-specific patterns**: 
   - Refer to the appropriate instruction file

3. **Ensure testability**: 
   - Add `data-testid` to all interactive elements

4. **Verify accessibility**: 
   - Test keyboard navigation
   - Check focus states
   - Validate semantic structure

/// <reference types="vite/client" />

// Vite raw imports for markdown files
declare module '*.md?raw' {
  const content: string
  export default content
}

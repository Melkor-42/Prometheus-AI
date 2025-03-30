/// <reference types="vite/client" />

declare module '*.svg?react' {
  import React from 'react'
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}

declare module '*.css' {
  const css: { [key: string]: string }
  export default css
}

declare module '*.scss' {
  const scss: { [key: string]: string }
  export default scss
}

declare module '*.sass' {
  const sass: { [key: string]: string }
  export default sass
} 
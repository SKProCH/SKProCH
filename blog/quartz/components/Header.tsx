import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Header: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return children.length > 0 ? <header>{children}</header> : null
}

Header.css = `
header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 2rem 0;
  gap: 1.5rem;
}

header h1 {
  margin: 0;
  flex: auto;
}

header .posts-link {
  color: var(--darkgray);
  font-size: 0.9rem;
  white-space: nowrap;
}

@media (min-width: 1200px) {
  .page-header {
    position: relative;
  }

  header .posts-link {
    position: absolute;
    left: -165px;
    top: 0;
  }
}
`

export default (() => Header) satisfies QuartzComponentConstructor

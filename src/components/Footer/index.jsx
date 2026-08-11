// Branded footer for the module.
const AUTHOR = 'Amir H. Bagheri';
const AUTHOR_URL = 'https://github.com/ahbagheri';
const YEAR = 2026;

export default function Footer() {
  return (
    <footer className="vm-footer">
      <span className="vm-footer-brand">Variable Matrix</span>
      <span>
        © {YEAR}{' '}
        <a className="vm-footer-link" href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
          {AUTHOR}
        </a>
      </span>
    </footer>
  );
}

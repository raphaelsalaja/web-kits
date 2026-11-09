import { AudioPreview } from "@/components/audio-preview";
import { Greeting } from "@/components/greeting";
import { TextPreview } from "@/components/text-preview";
import audioPkg from "@web-kits/audio/package.json";
import textPkg from "@web-kits/text/package.json";
import styles from "./page.module.css";

const products = [
  {
    name: "Audio",
    version: audioPkg.version,
    href: "https://www.npmjs.com/package/@web-kits/audio",
    preview: <AudioPreview />,
  },
  {
    name: "Text",
    version: textPkg.version,
    href: "https://www.npmjs.com/package/@web-kits/text",
    preview: <TextPreview />,
  },
] as const;

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.brand}>Web Kits</h1>
        <p className={styles.tagline}>Interface kits for the web.</p>
      </header>

      <section className={styles.section} aria-labelledby="products-label">
        <h2 id="products-label" className={styles.sectionLabel}>
          Products
        </h2>
        <ul className={styles.products}>
          {products.map((product) => (
            <li key={product.name} className={styles.product}>
              <div className={styles.preview}>{product.preview}</div>
              <a
                className={styles.meta}
                href={product.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.version}>v{product.version}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <Greeting />
      </footer>
    </main>
  );
}

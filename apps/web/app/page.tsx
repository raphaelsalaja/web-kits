import { Greeting } from "@/components/greeting";
import { kits, site } from "@/lib/kits";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.name}>{site.name}</h1>
        <p className={styles.tagline}>{site.description}</p>
      </header>

      <section aria-labelledby="kits-heading">
        <h2 id="kits-heading" className={styles.heading}>
          Kits
        </h2>
        <ul className={styles.list}>
          {kits.map((kit) => (
            <li key={kit.slug}>
              <a className={styles.row} href={kit.href}>
                <span className={styles.title}>
                  {kit.name}
                  <span className={styles.version}>v{kit.version}</span>
                </span>
                <span className={styles.description}>{kit.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <Greeting />
        <a className={styles.link} href={site.source}>
          GitHub
        </a>
      </footer>
    </main>
  );
}

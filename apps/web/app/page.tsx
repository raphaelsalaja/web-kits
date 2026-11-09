import type { ReactNode } from "react";
import { AudioPreview } from "@/components/audio-preview";
import { BlurPreview } from "@/components/blur-preview";
import { Greeting } from "@/components/greeting";
import { MotionBlurPreview } from "@/components/motion-blur-preview";
import { SpringboardPreview } from "@/components/springboard-preview";
import { TextPreview } from "@/components/text-preview";
import { type Kit, kits, npm, site } from "@/lib/kits";
import styles from "./page.module.css";

const previews: Record<Kit["slug"], ReactNode> = {
  audio: <AudioPreview />,
  springboard: <SpringboardPreview />,
  blur: <BlurPreview />,
  "motion-blur": <MotionBlurPreview />,
  calligraph: <TextPreview />,
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.brand}>{site.name}</h1>
        <p className={styles.tagline}>{site.description}</p>
      </header>

      <section aria-labelledby="kits-label">
        <h2 id="kits-label" className={styles.sectionLabel}>
          Kits
        </h2>
        <ul className={styles.kits}>
          {kits.map((kit) => (
            <li key={kit.slug} className={styles.kit}>
              <div className={styles.preview}>{previews[kit.slug]}</div>
              <div className={styles.details}>
                <h3 className={styles.kitName}>
                  {kit.name}
                  <span className={styles.version}>v{kit.version}</span>
                </h3>
                <p className={styles.description}>{kit.description}</p>
                <ul className={styles.links}>
                  <li>
                    <a className={styles.link} href={kit.guide.href}>
                      {kit.guide.label}
                    </a>
                  </li>
                  <li>
                    <a className={styles.link} href={npm(kit)}>
                      npm
                    </a>
                  </li>
                  <li>
                    <a className={styles.link} href={kit.source}>
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>
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

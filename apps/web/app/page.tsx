import Github from "@web-kits/icons/social-media/github";
import Linkedin from "@web-kits/icons/social-media/linkedin";
import XTwitter from "@web-kits/icons/social-media/x-twitter";
import { KitIcon } from "@/components/kit-icon";
import { kits, site } from "@/lib/kits";
import styles from "./page.module.css";

const social = [
  { label: "GitHub", href: site.source, Icon: Github },
  { label: "X", href: site.x, Icon: XTwitter },
  { label: "LinkedIn", href: site.linkedin, Icon: Linkedin },
];

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
                <KitIcon slug={kit.slug} />
                <span className={styles.text}>
                  <span className={styles.title}>
                    {kit.name}
                    <span className={styles.version}>v{kit.version}</span>
                  </span>
                  <span className={styles.description}>{kit.description}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <ul className={styles.social}>
          {social.map(({ label, href, Icon }) => (
            <li key={label}>
              <a className={styles.link} href={href} aria-label={label}>
                <Icon aria-hidden="true" title={label} width={16} height={16} />
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </main>
  );
}

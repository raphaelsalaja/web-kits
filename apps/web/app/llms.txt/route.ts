import { source } from "@/lib/docs/source";
import { kits, site } from "@/lib/kits";

export const revalidate = false;

export function GET() {
  const pages = source.getPages();

  const sections = kits.map((kit) => {
    const lines = pages
      .filter((page) => page.slugs[0] === kit.slug)
      .map((page) => {
        const url = `${site.url}${page.url}.mdx`;
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${url})${description}`;
      });

    return `## ${kit.name}

> ${kit.description}

- Package: ${kit.package} (npm)
- Docs: ${site.url}${kit.href}

${lines.join("\n")}`;
  });

  const content = `# ${site.name}

> ${site.description}

Every page is also available as Markdown by adding .mdx to its URL.

- Repository: ${site.source}

${sections.join("\n\n")}
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

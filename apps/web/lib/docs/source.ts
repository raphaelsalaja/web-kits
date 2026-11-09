import { docs } from "fumadocs-mdx:collections/server";
import type { Folder } from "fumadocs-core/page-tree";
import type { InferMetaType, InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";

export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;

export function getKitTree(kit: string): Folder | undefined {
  return source
    .getPageTree()
    .children.find(
      (node): node is Folder => node.type === "folder" && node.$id === kit,
    );
}

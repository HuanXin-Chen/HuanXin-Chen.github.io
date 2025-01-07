import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { CollectionEntry } from "astro:content";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
}

export default function Card({ href, frontmatter, secHeading = true }: Props) {
  const { title, pubDatetime, modDatetime, description, language, ogImage } =
    frontmatter;

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-lg font-medium decoration-dashed hover:underline",
  };
  const isFrench = language === "fr";

  const prefixedTitle = isFrench ? `🇫🇷 ${title}` : title;

  const ogImageUrl = typeof ogImage === "string" ? ogImage : ogImage?.src;
  const ogUrl = ogImageUrl ?? `/posts/${slugifyStr(title)}.png`;

  return (
    <li className="my-6">
      <div className="flex gap-4">
        {ogImage && (
          <img
            src={ogUrl}
            alt={title}
            className="aspect-square w-32 shrink-0 rounded-lg object-cover"
          />
        )}

        <div className="flex flex-col gap-2">
          {" "}
          {/* 减小间距 */}
          <a
            href={href}
            className="inline-block text-lg font-medium text-skin-accent decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0"
          >
            {secHeading ? (
              <h2
                {...headerProps}
                lang={language}
                className="text-base font-bold"
              >
                {" "}
                {/* 只调整大小和粗细 */}
                {prefixedTitle}
              </h2>
            ) : (
              <h3
                {...headerProps}
                lang={language}
                className="text-base font-bold"
              >
                {prefixedTitle}
              </h3>
            )}
          </a>
          <Datetime
            pubDatetime={pubDatetime}
            modDatetime={modDatetime}
            className="text-sm"
          />{" "}
          {/* 只调整大小 */}
          <p lang={language} className="text-sm">
            {" "}
            {/* 只调整大小 */}
            {description}
          </p>
        </div>
      </div>
    </li>
  );
}

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
          <div className="relative w-24 shrink-0">
            <img
              src={ogUrl}
              alt={title}
              width="36"
              height="36"
              loading="lazy"
              decoding="async"
              className="mx-auto block aspect-square h-auto w-24 rounded-lg object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
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
          />
          <p lang={language} className="text-sm">
            {description}
          </p>
        </div>
      </div>
    </li>
  );
}

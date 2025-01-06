import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://huanxin-chen.github.io/", // replace this with your deployed domain
  author: "HuanXin Chen",
  profile: "https://huanxin-chen.github.io/",
  desc: "Hi there,I’m HuanXin. Here I will record some of my wild thoughts in life and study !",
  title: "HuanXin's Blog",
  ogImage: "picture-of-me.png",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
};

export const LOCALE = {
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  langTag: ["zh-CN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/HuanXin-Chen",
    linkTitle: `${SITE.title} on Github`,
    active: true,
  },
  // {
  //   name: "LinkedIn",
  //   href: "https://www.linkedin.com/in/antoine-caron-slash/",
  //   linkTitle: `${SITE.title} on LinkedIn`,
  //   active: true,
  // },
  // {
  //   name: "Bluesky",
  //   href: "https://bsky.app/profile/slashgear.dev",
  //   linkTitle: `${SITE.title} on Bluesky`,
  //   active: true,
  // },
  // {
  //   name: "Twitter",
  //   href: "https://x.com/Slashgear_",
  //   linkTitle: `${SITE.title} on Twitter`,
  //   active: true,
  // },
  // {
  //   name: "Reddit",
  //   href: "https://www.reddit.com/user/slashgear_/",
  //   linkTitle: `${SITE.title} on Reddit`,
  //   active: true,
  // },
  // {
  //   name: "Hackernoon",
  //   href: "https://hackernoon.com/u/antoinecaron",
  //   linkTitle: `${SITE.title} on Hackernoon`,
  //   active: true,
  // },
  // {
  //   name: "Discord",
  //   href: "https://discordapp.com/users/199566011849113600",
  //   linkTitle: `${SITE.title} on Discord`,
  //   active: true,
  // },
  // {
  //   name: "Medium",
  //   href: "https://medium.com/@Slashgear_",
  //   linkTitle: `${SITE.title} on Medium`,
  //   active: true,
  // },
  // {
  //   name: "NPM",
  //   href: "https://www.npmjs.com/~slashgear",
  //   linkTitle: `${SITE.title} on Medium`,
  //   active: true,
  // },
];

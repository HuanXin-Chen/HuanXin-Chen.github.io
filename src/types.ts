import type socialIcons from "@assets/socialIcons";

export type Site = {
  website: string;
  author: string;
  profile: string;
  desc: string;
  title: string;
  ogImage?: string;
  lightAndDarkMode: boolean;
  postPerIndex: number;
  postPerPage: number;
  scheduledPostMargin: number;
};

export type SocialObjects = {
  name: keyof typeof socialIcons;
  href: string;
  active: boolean;
  linkTitle: string;
}[];

export type Event = {
  name: string;
  date: number;
  site: string;
  link?: string;
  video?: string;
};

export type Speaker = {
  name: string;
  site: string;
};

export type Conference = {
  id: string;
  data: {
    title: string;
    lang: "fr" | "en";
    year: number;
    description: string;
    events: Event[];
    cospeakers?: Speaker[];
  };
};

export type SocialIcons = {
  Github: string;
  Xiaohongshu: string;
  Wechat: string;
  Douyin: string;
  QQMail: string;
  // ... 其他已有的类型
};

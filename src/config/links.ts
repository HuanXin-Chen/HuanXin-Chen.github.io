import type { LinkButtonProps } from "../components/LinkButton";

import IconGitHub from "../assets/github.svg";
import IconMail from "../assets/mail.svg";

const links: LinkButtonProps[] = [
  {
    name: "Mail",
    link: "http://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=lKWkoaKmpaKmpKzU5eW69-v5",
    iconUrl: IconMail.src,
  },
  {
    name: "GitHub",
    link: "https://github.com/HuanXin-Chen",
    iconUrl: IconGitHub.src,
  },
];

export default links;

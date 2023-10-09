export const SITE = {
	title: 'H_X‘s blog👨‍💻 ',
	description: 'Your website description.',
	defaultLanguage: 'en-us',
} as const

export const OPEN_GRAPH = {
	image: {
		src: '',
		alt:
			'astro logo on a starry expanse of space,' +
			' with a purple saturn-like planet floating in the right foreground',
	},
	twitter: 'astrodotbuild',
}

export const KNOWN_LANGUAGES = {
	English: 'en',
} as const
export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES)

export const GITHUB_EDIT_URL = `https://github.com/withastro/astro/tree/main/examples/docs`

export const COMMUNITY_INVITE_URL = `https://astro.build/chat`

// See "Algolia" section of the README for more information.
export const ALGOLIA = {
	indexName: 'XXXXXXXXXX',
	appId: 'XXXXXXXXXX',
	apiKey: 'XXXXXXXXXX',
}

export type Sidebar = Record<
	(typeof KNOWN_LANGUAGE_CODES)[number],
	Record<string, { text: string; link: string }[]>
>
export const SIDEBAR: Sidebar = {
	en: {
		'🌱WELCOME': [
			{ text: 'Introduction', link: 'en/introduction' },
		],
		'POST2023💬': [
			{text:'一文自顶向下串起MySQL',link:'en/page-5'},
			{text:'分布式ID中的SnowFlake',link:'en/page-4'},
			{text:'反射实现DTO速转VO',link:'en/page-3'},
			{text:'SpringBoot3极简上手指南', link:'en/page-2'},
			{text:'图解四种背包问题即优化', link:'en/page-1'},
			{text:'CISCN2023的PWN', link:'en/page-0'},
		],
	},
}

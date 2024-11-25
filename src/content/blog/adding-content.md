---
title: "Adding blog posts directly"
description: "Learn how to add content to your blog directly in the code (without using pagescms)"
pubDate: "Oct 24 2024"
published: true
heroImage: "/src/assets/blog-placeholder-4.jpg"
tags: ["setup", "markdown"]
---

Add content to your blog by creating new markdown files in the `src/content/blog/` directory. Each markdown file should have a frontmatter block at the top of the file that contains metadata about the post. Here is an example of a frontmatter block:

```md
---
title: "My first blog post"
description: "This is my first blog post"
pubDate: "Oct 24 2024"
heroImage: "../../assets/blog-placeholder-4.jpg"
tags: ["first", "blog"]
---
```

Check out all the [options you can use in the frontmatter of a blog post](../post-options).

After that just write your content in markdown format (you don't need to write the title again, it will be automatically added to the page).
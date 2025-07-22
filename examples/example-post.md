+++
title = "Example Blog Post for Hugo Syndicate"
description = "This is an example blog post showing how to configure Hugo posts for syndication using Hugo Syndicate"
showDescription = false
cover = "/img/covers/example-post.jpg"
tags = ["hugo", "devto", "automation", "blogging"]
categories = ["dev.to", "tutorials"]
series = [""]
disableComments = false
date = "2025-07-01T10:00:00Z"
lastMod = "2025-07-01T10:00:00Z"
devto = true
draft = false
+++

# Example Blog Post

This is an example blog post that demonstrates how to configure your Hugo posts for automatic syndication using Hugo Syndicate.

## Required Front Matter

To sync a post to dev.to, you need to include `devto = true` in your front matter. Here's what each field does:

- `title`: The post title (required)
- `description`: Post description (optional but recommended)
- `tags`: Array of tags for categorization
- `categories`: Must include "dev.to" for sync eligibility
- `devto = true`: Enables synchronization to dev.to
- `draft = false`: Ensures the post is not a draft

## Hugo Shortcodes

Hugo Syndicate automatically transforms Hugo shortcodes to dev.to compatible format:

### Image Example

{{< image src="/img/example.jpg" alt="Example image" >}}

### Code Example

{{< code language="javascript" title="Hello World Example" >}}
console.log("Hello, World!");
const greeting = "Welcome to our blog!";
{{< /code >}}

### YouTube Example

{{< youtube dQw4w9WgXcQ >}}

### Twitter Example

{{< twitter 1234567890 >}}

### Gist Example

{{< gist username abc123def456 >}}

## Regular Markdown

All regular markdown content is preserved as-is:

```javascript
// This code block will remain unchanged
function example() {
  return "This is regular markdown";
}
```

## Lists and Other Content

- Bullet points work normally
- **Bold text** is preserved
- _Italic text_ is preserved
- [Links](https://example.com) work as expected

1. Numbered lists
2. Are also preserved
3. Without modification

## Conclusion

This example demonstrates how Hugo Syndicate handles various types of content and Hugo shortcodes when syncing to dev.to.

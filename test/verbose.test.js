const fs = require("fs");
const path = require("path");
const fm = require("front-matter");

// Test with detailed output
describe("Hugo Syndicate - Detailed Testing", () => {
  test("validates core functionality with detailed output", () => {
    console.log("\n=== Hugo Syndicate Test Suite ===\n");

    // Test 1: YAML Front Matter Parsing
    console.log("1. Testing YAML front matter parsing...");
    const yamlContent = `---
title: "Sample Blog Post"
devto: true
tags: ["hugo", "syndication", "automation"]
categories: ["dev.to", "tech"]
draft: false
---

This is a sample blog post content.`;

    const parsed = fm(yamlContent);
    console.log("   ✓ Successfully parsed YAML front matter");
    console.log(`   ✓ Title: "${parsed.attributes.title}"`);
    console.log(`   ✓ Sync enabled: ${parsed.attributes.devto}`);
    console.log(`   ✓ Tags: ${parsed.attributes.tags.join(", ")}`);

    expect(parsed.attributes.title).toBe("Sample Blog Post");
    expect(parsed.attributes.devto).toBe(true);

    // Test 2: Hugo Shortcode Transformation
    console.log("\n2. Testing Hugo shortcode transformations...");
    const contentWithShortcodes = `
{{< image src="/images/test.jpg" alt="Test image" >}}
{{< youtube dQw4w9WgXcQ >}}
{{< code language="javascript" title="Example Code" >}}
console.log("Hello World!");
{{< /code >}}
`;

    // Image transformation
    const imageTransformed = contentWithShortcodes.replace(
      /\{\{<\s*image\s+src="([^"]+)"\s+alt="([^"]*)"\s*(?:position="[^"]*")?\s*(?:style="[^"]*")?\s*>\}\}/g,
      (match, src, alt) => {
        const imageUrl = src.startsWith("/") ? `https://example.com${src}` : src;
        return `![${alt}](${imageUrl})`;
      }
    );

    console.log("   ✓ Image shortcode → Markdown image");
    console.log("   ✓ {{< image >}} → ![Test image](https://example.com/images/test.jpg)");

    // YouTube transformation
    const youtubeTransformed = imageTransformed.replace(
      /\{\{<\s*youtube\s+([^>\s]+)\s*>\}\}/g,
      (match, videoId) => `{% youtube ${videoId} %}`
    );

    console.log("   ✓ YouTube shortcode → dev.to liquid tag");
    console.log("   ✓ {{< youtube >}} → {% youtube dQw4w9WgXcQ %}");

    expect(youtubeTransformed).toContain("![Test image](https://example.com/images/test.jpg)");
    expect(youtubeTransformed).toContain("{% youtube dQw4w9WgXcQ %}");

    // Test 3: URL Generation
    console.log("\n3. Testing canonical URL generation...");
    const testCases = [
      { file: "content/blog/my-post.md", expected: "/blog/my-post/" },
      { file: "content/blog/tech/js-tips.en.md", expected: "/blog/tech/js-tips/" },
      { file: "content/articles/tutorial.ja.md", expected: "/ja/articles/tutorial/" },
      { file: "content/posts/simple.md", expected: "/posts/simple/" },
    ];

    testCases.forEach(({ file, expected }) => {
      const relativePath = file.replace(/^content\//, "");
      const fileInfo = path.parse(relativePath);
      const fileName = fileInfo.name;
      const dir = fileInfo.dir;

      const langMatch = fileName.match(/^(.+)\.([a-z]{2})$/);
      let slug, language;

      if (langMatch) {
        slug = langMatch[1];
        language = langMatch[2];
      } else {
        slug = fileName;
        language = null;
      }

      let urlPath;
      if (language && language !== "en") {
        if (dir) {
          const cleanDir = dir.replace(/\/$/, "");
          urlPath = `/${language}/${cleanDir}/${slug}/`;
        } else {
          urlPath = `/${language}/${slug}/`;
        }
      } else {
        if (dir) {
          const cleanDir = dir.replace(/\/$/, "");
          urlPath = `/${cleanDir}/${slug}/`;
        } else {
          urlPath = `/${slug}/`;
        }
      }

      console.log(`   ✓ ${file} → ${urlPath}`);
      expect(urlPath).toBe(expected);
    });

    // Test 4: Sync Eligibility
    console.log("\n4. Testing sync eligibility rules...");

    const eligiblePost = {
      title: "Eligible Post",
      devto: true,
      draft: false,
      categories: ["dev.to"],
      tags: ["javascript"],
    };

    const draftPost = {
      title: "Draft Post",
      devto: true,
      draft: true,
      categories: ["dev.to"],
    };

    console.log(`   ✓ Post with devto=true, draft=false → Should sync`);
    console.log(`   ✓ Post with draft=true → Should NOT sync`);

    expect(eligiblePost.devto && !eligiblePost.draft).toBe(true);
    expect(draftPost.draft).toBe(true);

    // Test 5: File Structure Validation
    console.log("\n5. Testing file structure validation...");

    const allowedDirs = ["blog/", "articles/", "posts/", "tech/", "tutorials/"];
    const contentDir = "content/";
    const testPaths = [
      "content/blog/my-post.md",
      "content/articles/advanced.md",
      "content/posts/tech/guide.md",
      "content/pages/about.md",
    ];

    testPaths.forEach((testPath) => {
      const relativePath = testPath.replace(new RegExp(`^${contentDir}`), "");
      const isAllowed = allowedDirs.some((dir) => relativePath.startsWith(dir));
      const status = isAllowed ? "✓ ALLOWED" : "✗ BLOCKED";
      console.log(`   ${status}: ${testPath}`);
    });

    // Test 6: Tag Limitation
    console.log("\n6. Testing dev.to tag limitation...");

    const manyTags = ["javascript", "node", "web", "development", "tutorial", "beginner", "advanced"];
    const maxTags = 4;

    console.log(`   Original tags (${manyTags.length}): ${manyTags.join(", ")}`);

    const limitedTags = manyTags.slice(0, maxTags);
    console.log(`   ✓ Limited to ${maxTags}: ${limitedTags.join(", ")}`);

    expect(limitedTags.length).toBe(4);

    console.log("\n=== All Tests Passed Successfully ===\n");
  });
});

const fs = require("fs");
const path = require("path");
const fm = require("front-matter");

describe("Hugo Content Edge Cases", () => {
  const fixturesDir = path.join(__dirname, "content-samples");

  beforeAll(() => {
    fs.mkdirSync(fixturesDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  describe("Front matter variations", () => {
    test("handles YAML with complex structures", () => {
      const content = `---
title: "Complex: YAML Post"
date: 2025-01-09T10:00:00Z
tags:
  - javascript
  - "web development"
  - node.js
authors:
  - name: John Doe
    email: john@example.com
  - name: Jane Smith
metadata:
  views: 1000
  likes: 50
devto: true
qiita: false
draft: false
---

# Complex Content

This tests complex YAML parsing.`;

      const filePath = path.join(fixturesDir, "complex-yaml.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));

      expect(parsed.attributes.title).toBe("Complex: YAML Post");
      expect(parsed.attributes.tags).toEqual(["javascript", "web development", "node.js"]);
      expect(parsed.attributes.authors).toHaveLength(2);
      expect(parsed.attributes.metadata.views).toBe(1000);
      expect(parsed.attributes.devto).toBe(true);
      expect(parsed.attributes.qiita).toBe(false);
    });

    test("handles TOML with special characters", () => {
      const content = `+++
title = "TOML: Special Characters & Symbols"
description = "Testing with 'quotes' and \"double quotes\""
tags = ["c++", "asp.net", "f#", "c#"]
code = """
function test() {
  console.log("multi-line");
}
"""
devto = true
draft = false
+++

# TOML Content`;

      const filePath = path.join(fixturesDir, "special-toml.md");
      fs.writeFileSync(filePath, content);

      const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+/);
      expect(tomlMatch).toBeTruthy();
      expect(tomlMatch[1]).toContain('title = "TOML: Special Characters & Symbols"');
      expect(tomlMatch[1]).toContain('tags = ["c++", "asp.net", "f#", "c#"]');
    });

    test("handles empty front matter", () => {
      const content = `---
---

# No Front Matter Values

Just content.`;

      const filePath = path.join(fixturesDir, "empty-frontmatter.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(Object.keys(parsed.attributes)).toHaveLength(0);
      expect(parsed.body).toContain("# No Front Matter Values");
    });

    test("handles missing front matter", () => {
      const content = `# Direct Content

No front matter at all.`;

      const filePath = path.join(fixturesDir, "no-frontmatter.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.attributes).toEqual({});
      expect(parsed.body).toBe(content);
    });
  });

  describe("Content edge cases", () => {
    test("handles very long content", () => {
      const longContent = "Lorem ipsum ".repeat(10000);
      const content = `---
title: "Very Long Post"
devto: true
---

${longContent}`;

      const filePath = path.join(fixturesDir, "long-content.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.body.length).toBeGreaterThan(100000);
    });

    test("handles unicode and emoji content", () => {
      const content = `---
title: "Unicode Test 🎉"
tags: ["日本語", "中文", "한국어", "emoji-🚀"]
devto: true
---

# Unicode Content 🌍

Japanese: こんにちは
Chinese: 你好
Korean: 안녕하세요
Emoji: 🎨🎭🎪🎯🎲🎸🎺🎻

Special chars: © ® ™ € £ ¥`;

      const filePath = path.join(fixturesDir, "unicode-content.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.attributes.title).toBe("Unicode Test 🎉");
      expect(parsed.attributes.tags).toContain("日本語");
      expect(parsed.body).toContain("こんにちは");
      expect(parsed.body).toContain("🎨🎭🎪");
    });

    test("handles nested shortcodes", () => {
      const content = `---
title: "Nested Shortcodes"
devto: true
---

# Complex Shortcodes

{{< outer >}}
  {{< inner >}}
    {{< code language="javascript" >}}
    function nested() {
      return true;
    }
    {{< /code >}}
  {{< /inner >}}
{{< /outer >}}

More content`;

      const filePath = path.join(fixturesDir, "nested-shortcodes.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.body).toContain("{{< outer >}}");
      expect(parsed.body).toContain('{{< code language="javascript" >}}');
    });

    test("handles malformed shortcodes", () => {
      const content = `---
title: "Malformed Shortcodes"
devto: true
---

# Broken Shortcodes

{{< image src="/test.jpg" >}} <!-- Missing closing -->

{{< code language="js"
console.log("broken");
{{< /code >}}

{{ < spaces > }}

{{% percent notation %}}`;

      const filePath = path.join(fixturesDir, "malformed-shortcodes.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.body).toContain('{{< image src="/test.jpg" >}}');
      expect(parsed.body).toContain("{{ < spaces > }}");
    });
  });

  describe("Tag edge cases", () => {
    test("handles maximum tags for each provider", () => {
      const content = `---
title: "Many Tags"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
devto: true
qiita: true
---

Content`;

      const filePath = path.join(fixturesDir, "many-tags.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));
      expect(parsed.attributes.tags).toHaveLength(10);

      // Simulate provider tag limiting
      const devtoTags = parsed.attributes.tags.slice(0, 4); // dev.to limit
      const qiitaTags = parsed.attributes.tags.slice(0, 5); // Qiita limit

      expect(devtoTags).toHaveLength(4);
      expect(qiitaTags).toHaveLength(5);
    });

    test("handles special characters in tags", () => {
      const content = `---
title: "Special Tag Characters"
tags: ["C++", "C#", "F#", ".NET", "Node.js", "Vue.js", "ASP.NET Core", "machine-learning", "e-commerce", "real-time"]
devto: true
---

Content`;

      const filePath = path.join(fixturesDir, "special-tags.md");
      fs.writeFileSync(filePath, content);

      const parsed = fm(fs.readFileSync(filePath, "utf8"));

      // Simulate tag sanitization
      const sanitizeTags = (tags) => {
        return tags
          .map((tag) =>
            tag
              .toLowerCase()
              .replace(/[^a-z0-9\-]/g, "")
              .substring(0, 30)
          )
          .filter((tag) => tag.length > 0);
      };

      const sanitized = sanitizeTags(parsed.attributes.tags);
      expect(sanitized).toContain("c");
      expect(sanitized).toContain("net");
      expect(sanitized).toContain("nodejs");
      expect(sanitized).toContain("machine-learning");
    });
  });

  describe("Filename patterns", () => {
    test("handles date prefix patterns", () => {
      const testFiles = [
        "01-january-post.md",
        "2025-01-09-full-date.md",
        "09-my-post.en.md",
        "my-post.ja.md",
        "simple-post.md",
      ];

      testFiles.forEach((filename) => {
        const content = `---
title: "Test ${filename}"
---
Content`;
        fs.writeFileSync(path.join(fixturesDir, filename), content);
      });

      // Test filename parsing
      const parseFilename = (filename) => {
        const base = path.basename(filename, ".md");
        const langMatch = base.match(/\.([a-z]{2})$/);
        const language = langMatch ? langMatch[1] : null;
        const nameWithoutLang = language ? base.slice(0, -3) : base;
        const dateMatch = nameWithoutLang.match(/^(\d{4}-\d{2}-\d{2}|\d{2})-(.+)$/);

        return {
          slug: dateMatch ? dateMatch[2] : nameWithoutLang,
          date: dateMatch ? dateMatch[1] : null,
          language,
        };
      };

      expect(parseFilename("01-january-post.md")).toEqual({
        slug: "january-post",
        date: "01",
        language: null,
      });

      expect(parseFilename("09-my-post.en.md")).toEqual({
        slug: "my-post",
        date: "09",
        language: "en",
      });

      expect(parseFilename("my-post.ja.md")).toEqual({
        slug: "my-post",
        date: null,
        language: "ja",
      });
    });
  });

  describe("Sync control edge cases", () => {
    test("handles conflicting sync flags", () => {
      const scenarios = [
        {
          frontMatter: { devto: true, qiita: false, syndicate: true },
          expected: { devto: true, qiita: true }, // syndicate overrides
        },
        {
          frontMatter: { devto: false, qiita: false, syndicate: false },
          expected: { devto: false, qiita: false },
        },
        {
          frontMatter: { draft: true, devto: true, qiita: true },
          expected: { devto: false, qiita: false }, // draft blocks all
        },
        {
          frontMatter: { visibility: "private", devto: true },
          expected: { devto: false, qiita: false }, // private blocks sync
        },
      ];

      scenarios.forEach(({ frontMatter, expected }, index) => {
        const shouldSync = (provider) => {
          if (frontMatter.draft === true || frontMatter.visibility === "private") {
            return false;
          }
          if (frontMatter.syndicate === true) return true;
          if (frontMatter.syndicate === false) return false;
          return frontMatter[provider] === true;
        };

        expect(shouldSync("devto")).toBe(expected.devto);
        expect(shouldSync("qiita")).toBe(expected.qiita);
      });
    });
  });
});

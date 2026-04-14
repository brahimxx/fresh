import fs from "fs";
import path from "path";

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith(".js") && fullPath.includes("/api/")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let modified = false;

      // Ensure import is there
      if (
        (content.includes('searchParams.get("salon_id")') ||
          content.includes("searchParams.get('salon_id')") ||
          content.includes('searchParams.get("salonId")') ||
          content.includes("searchParams.get('salonId')")) &&
        !content.includes("import { decodeId }")
      ) {
        let importDepth = 2; // relative path hack, calculate real depth
        const parts = fullPath.split("/api/")[1].split("/");
        importDepth = parts.length; // e.g., salons/[id]/route.js -> 3 -> ../../../

        let prefix = "";
        for (let i = 0; i < importDepth; i++) prefix += "../";

        content = `import { decodeId } from '${prefix}../lib/id';\n` + content;
        modified = true;
      }

      // Replace common patterns
      const regex1 =
        /const\s+salonId\s*=\s*searchParams\.get\((['"])salonId\1\)\s*\|\|\s*searchParams\.get\((['"])salon_id\2\);/g;
      const sub1 =
        "const rawSalonId = searchParams.get($1salonId$1) || searchParams.get($2salon_id$2);\n    const salonId = rawSalonId ? decodeId(rawSalonId) : null;";
      if (regex1.test(content)) {
        content = content.replace(regex1, sub1);
        modified = true;
      }

      const regex2 =
        /const\s+salonId\s*=\s*searchParams\.get\((['"])salon_id\1\)\s*\|\|\s*searchParams\.get\((['"])salonId\2\);/g;
      const sub2 =
        "const rawSalonId = searchParams.get($1salon_id$1) || searchParams.get($2salonId$2);\n    const salonId = rawSalonId ? decodeId(rawSalonId) : null;";
      if (regex2.test(content)) {
        content = content.replace(regex2, sub2);
        modified = true;
      }

      const regex3 =
        /const\s+salonId\s*=\s*searchParams\.get\((['"])salon_id\1\);/g;
      const sub3 =
        "const rawSalonId = searchParams.get($1salon_id$1);\n    const salonId = rawSalonId ? decodeId(rawSalonId) : null;";
      if (regex3.test(content)) {
        content = content.replace(regex3, sub3);
        modified = true;
      }

      const regex4 =
        /const\s+salonId\s*=\s*searchParams\.get\((['"])salonId\1\);/g;
      const sub4 =
        "const rawSalonId = searchParams.get($1salonId$1);\n    const salonId = rawSalonId ? decodeId(rawSalonId) : null;";
      if (regex4.test(content)) {
        content = content.replace(regex4, sub4);
        modified = true;
      }

      if (modified) {
        // Fix import path to be safe, assuming everything is inside src/app/api/...
        // A better way is absolute alias @/lib/id if configured. Let's use @/lib/id!
        content = content.replace(
          /import \{ decodeId \} from '\.\.\/[^']+';/,
          "import { decodeId } from '@/lib/id';",
        );
        fs.writeFileSync(fullPath, content);
        console.log("Updated", fullPath);
      }
    }
  }
}

processDirectory("./src/app/api");

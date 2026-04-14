import fs from "fs";
import path from "path";

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");

      if (
        content.includes("encodeId") &&
        !content.includes("import { encodeId }") &&
        !content.includes("import { encodeId,")
      ) {
        content = `import { encodeId } from '@/lib/id';\n` + content;
        fs.writeFileSync(fullPath, content);
        console.log("Added encodeId import to", fullPath);
      }
    }
  }
}

processDirectory("./src/app/api");
processDirectory("./src/app/dashboard");
processDirectory("./src/app/(marketplace)");
processDirectory("./src/components");
processDirectory("./src/hooks");
processDirectory("./src/providers");

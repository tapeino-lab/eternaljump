import fs from 'fs';
const files = ['src/update-entities.ts', 'src/update-playing.ts', 'src/update-post.ts'];
for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/pBtn\.style\.display = 'none';/g, "// pBtn.style.display = 'none';");
  fs.writeFileSync(file, content);
}
console.log("Done");

// update-html.js (프로젝트 루트 디렉토리에 생성)

const fs = require('fs');
const path = require('path');

const htmlFilesDir = './dist'; // HTML 파일들이 있는 디렉토리 (dist/)

// 매핑 파일 읽기 헬퍼 함수
function readMappingFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return new Map();
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    const mapping = new Map();
    lines.forEach(line => {
        const [oldPath, newPath] = line.split(',');
        if (oldPath && newPath) {
            mapping.set(oldPath.trim(), newPath.trim());
        }
    });
    return mapping;
}

const jsMapping = readMappingFile('js_mapping.txt');
const cssMapping = readMappingFile('css_mapping.txt');

console.log('JS MAPPING:', jsMapping);
console.log('CSS MAPPING:', cssMapping);

// HTML 파일들을 재귀적으로 찾기
function findHtmlFiles(dir) {
    let htmlFiles = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            htmlFiles = htmlFiles.concat(findHtmlFiles(fullPath));
        } else if (stat.isFile() && file.endsWith('.html')) {
            htmlFiles.push(fullPath);
        }
    }
    return htmlFiles;
}

const htmlFiles = findHtmlFiles(htmlFilesDir);

htmlFiles.forEach(htmlFilePath => {
    console.log(`Updating references in: ${htmlFilePath}`);
    let content = fs.readFileSync(htmlFilePath, 'utf8');

    jsMapping.forEach((newPath, oldPath) => {
        // 이 정규식은 Node.js 환경에서 올바릅니다.
        const escapedOldPath = oldPath.replace(/[.*+?^${}()|[$$$$/g, '\\$&');
        const regex = new RegExp(`src=["']\\/?${escapedOldPath}["']`, 'g');
        content = content.replace(regex, `src="${newPath}"`);
        console.log(`  JS: Replaced src ${oldPath} with ${newPath}`);
    });

    cssMapping.forEach((newPath, oldPath) => {
        const escapedOldPath = oldPath.replace(/[.*+?^${}()|[$$$$/g, '\\$&');
        const regex = new RegExp(`href=["']\\/?${escapedOldPath}["']`, 'g');
        content = content.replace(regex, `href="${newPath}"`);
        console.log(`  CSS: Replaced href ${oldPath} with ${newPath}`);
    });

    // 파일 상단에 처리되었음을 알리는 주석 추가 (캐시 무효화용)
    const timestamp = new Date().toLocaleString();
    content = `<!-- Files processed: ${timestamp} -->\n` + content;

    fs.writeFileSync(htmlFilePath, content, 'utf8');
    console.log(`Updated references in ${htmlFilePath}`);
});

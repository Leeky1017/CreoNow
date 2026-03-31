const fs = require('fs');
let code = fs.readFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', 'utf8');

code = code.replace(/bg-\[#0D0D0D\]/g, 'bg-[var(--editor-bg)]');
code = code.replace(/className="max-w-\[720px\] mx-auto w-full px-\[32px\] pt-\[48px\] pb-\[40vh\]"/g, 'className="mx-auto w-full px-[80px] pt-[48px] pb-[40vh]"');

// Cleanup inline fonts for editor
code = code.replace(/style=\{\{\s*fontFamily:\s*"'Source Serif 4', 'Noto Serif SC', Georgia, serif"(,\s*)?\s*\}\}/g, '');
code = code.replace(/style=\{\{\s*\}\}/g, '');

// Header classes
code = code.replace(/text-\[32px\] font-bold text-\[#F0F0F0\] leading-\[1.25\] tracking-\[-0.01em\]/g, 'text-[32px] font-bold text-foreground leading-[1.25] tracking-[-0.01em] font-[family-name:var(--font-editor)]');
code = code.replace(/text-\[28px\] font-bold text-\[#F0F0F0\] leading-\[1.2\] tracking-\[-0.01em\] mt-\[40px\] mb-\[16px\]/g, 'text-[28px] font-bold text-foreground leading-[1.2] tracking-[-0.01em] mt-[40px] mb-[16px] font-[family-name:var(--font-editor)]');
code = code.replace(/text-\[22px\] font-semibold text-\[#F0F0F0\] leading-\[1.3\] mt-\[32px\] mb-\[12px\]/g, 'text-[22px] font-semibold text-foreground leading-[1.3] mt-[32px] mb-[12px] font-[family-name:var(--font-editor)]');
code = code.replace(/text-\[18px\] font-semibold text-\[#F0F0F0\] leading-\[1.35\] mt-\[24px\] mb-\[8px\]/g, 'text-[18px] font-semibold text-foreground leading-[1.35] mt-[24px] mb-[8px] font-[family-name:var(--font-editor)]');


// p tags
code = code.replace(/text-\[16px\] font-normal text-\[#CCCCCC\] leading-\[1.8\]/g, 'text-lg font-normal text-[var(--editor-text)] leading-[1.8] font-[family-name:var(--font-editor)]');
code = code.replace(/text-\[16px\] font-normal text-\[#CCCCCC\]/g, 'text-lg font-normal text-[var(--editor-text)] font-[family-name:var(--font-editor)]');
// text-[16px] text-[#888888]
code = code.replace(/text-\[16px\] italic text-\[#888888\] leading-\[1.8\]/g, 'text-lg italic text-[var(--editor-text-muted)] leading-[1.8] font-[family-name:var(--font-editor)]');

fs.writeFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', code);

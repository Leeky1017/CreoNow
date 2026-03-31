const fs = require('fs');
let code = fs.readFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', 'utf8');

code = code.replace(/bg-\[#0D0D0D\]/g, 'bg-[var(--editor-bg)]');

code = code.replace(/className="max-w-\[720px\] mx-auto w-full px-\[32px\] pt-\[48px\] pb-\[40vh\]"/g, 'className="mx-auto w-full px-[80px] pt-[48px] pb-[40vh]"');

// Clean up styles
code = code.replace(/style=\{\{\s*fontFamily:\s*"'Source Serif 4', 'Noto Serif SC', Georgia, serif",?\s*\}\}/g, '');
// For H1, H2, H3 etc, it might leave an empty style attr.
code = code.replace(/style=\{\{\s*\}\}/g, '');

// p tags
code = code.replace(/text-\[16px\] font-normal text-\[#CCCCCC\] leading-\[1.8\]/g, 'text-lg font-normal text-[var(--editor-text)] leading-[1.8] font-[family-name:var(--font-editor)]');
code = code.replace(/text-\[16px\] font-normal text-\[#CCCCCC\]/g, 'text-lg font-normal text-[var(--editor-text)] font-[family-name:var(--font-editor)]');
// text-[16px] text-[#888888]
code = code.replace(/text-\[16px\] font-normal text-\[#888888\] leading-\[1.8\]/g, 'text-lg font-normal text-[var(--editor-text-muted)] leading-[1.8] font-[family-name:var(--font-editor)]');

// AI block
const aiBlockOld = `{/* Agent generated inline block */}
            <div className="relative bg-[rgba(122,162,247,0.06)] border-l-[2px] border-[#7AA2F7] rounded-l-[1px] pl-[16px] py-[12px]">
              <div className="flex items-center gap-[16px] mb-[8px]">
                <button className="text-[13px] font-medium text-[#4ADE80]">
                  ✓ Accept
                </button>
                <button className="text-[13px] font-medium text-[#F87171]">
                  ✕ Reject
                </button>
                <button className="text-[13px] font-medium text-[#555555]">
                  ↻ Regenerate
                </button>
              </div>
              <p
                className="text-[16px] font-normal text-[#CCCCCC] leading-[1.8]"
                
              >
                At its core, a silent interface is a confident interface. It doesn't need to shout to be understood.
              </p>
            </div>`;
// Wait, the regex replacement for AI block could be tricky because I stripped styles.
fs.writeFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', 'utf8');

const oldAi = `<div className="relative bg-\\[rgba\\(122,162,247,0.06\\)\\] border-l-\\[2px\\] border-\\[#7AA2F7\\] rounded-l-\\[1px\\] pl-\\[16px\\] py-\\[12px\\]">
              <div className="flex items-center gap-\\[16px\\] mb-\\[8px\\]">
                <button className="text-\\[13px\\] font-medium text-\\[#4ADE80\\]">
                  ✓ Accept
                </button>
                <button className="text-\\[13px\\] font-medium text-\\[#F87171\\]">
                  ✕ Reject
                </button>
                <button className="text-\\[13px\\] font-medium text-\\[#555555\\]">
                  ↻ Regenerate
                </button>
              </div>`;

const newAi = `<div className="my-4 border-l-2 border-foreground/30 pl-3 py-2">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <button className="hover:text-foreground">接受</button>
                <span>·</span>
                <button className="hover:text-foreground">编辑</button>
                <span>·</span>
                <button className="hover:text-foreground">重新生成</button>
              </div>`;

code = code.replace(new RegExp(oldAi, "g"), newAi);

// Oh wait, I also need to make sure the AI paragraph text color is muted:
// The paragraph below the AI buttons needs "text-[var(--editor-text-muted)]" 
// It was changed to text-[var(--editor-text)] by the global regex probably? Wait, it wasn't replaced since its style block wasn't exactly matched.
fs.writeFileSync('apps/desktop/renderer/src/app/pages/EditorPage.tsx', code);

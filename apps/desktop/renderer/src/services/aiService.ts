const delay = () => new Promise<void>((r) => setTimeout(r, 300));

const MOCK_REPLIES = [
  '这段描写很有画面感。建议在第三段增加一些听觉细节，比如风声或远处的钟声，让氛围更加立体。',
  '角色对话可以更自然一些，试试把书面语改为口语化的表达，比如把"我认为"改为"我觉得"。',
  '整体结构不错，但高潮部分来得稍早，可以在前面再铺垫一两个伏笔。',
  '这个角色的动机还不够清晰，建议补充一段内心独白来揭示他的真实想法。',
  '场景转换很流畅。如果在转场前加入一个悬念，读者的阅读欲望会更强。',
];

let replyIdx = 0;

export const aiService = {
  async sendMessage(content: string): Promise<{ role: 'assistant'; content: string }> {
    await delay();
    void content;
    const reply = MOCK_REPLIES[replyIdx % MOCK_REPLIES.length];
    replyIdx++;
    return { role: 'assistant', content: reply };
  },

  async getSuggestions(context: string): Promise<string[]> {
    await delay();
    void context;
    return [
      '增加环境描写',
      '深化角色动机',
      '调整叙事节奏',
    ];
  },
};

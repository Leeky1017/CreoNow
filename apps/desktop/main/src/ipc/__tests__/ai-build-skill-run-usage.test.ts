import { describe, expect, it } from "vitest";

import { buildSkillRunUsage } from "../ai";

describe("buildSkillRunUsage", () => {
  it("在 cachedTokens 缺失时不应注入 cachedTokens 字段", () => {
    const usage = buildSkillRunUsage({
      modelPricingByModel: new Map([
        [
          "gpt-5.2",
          {
            promptPer1kTokens: 0.0015,
            completionPer1kTokens: 0.003,
            cachedInputPricePer1kTokens: 0.0003,
          },
        ],
      ]),
      model: "gpt-5.2",
      promptTokens: 120,
      completionTokens: 30,
      sessionTotalTokens: 150,
    });

    expect(usage).toMatchObject({
      promptTokens: 120,
      completionTokens: 30,
      sessionTotalTokens: 150,
    });
    expect("cachedTokens" in usage).toBe(false);
  });

  it("在 cachedTokens > 0 且配置 cachedInputPricePer1kTokens 时按分段价格计算费用", () => {
    const usage = buildSkillRunUsage({
      modelPricingByModel: new Map([
        [
          "gpt-5.2",
          {
            promptPer1kTokens: 0.0015,
            completionPer1kTokens: 0.003,
            cachedInputPricePer1kTokens: 0.0003,
          },
        ],
      ]),
      model: "gpt-5.2",
      promptTokens: 1200,
      completionTokens: 300,
      cachedTokens: 200,
      sessionTotalTokens: 1500,
    });

    expect(usage).toMatchObject({
      promptTokens: 1200,
      completionTokens: 300,
      cachedTokens: 200,
      sessionTotalTokens: 1500,
      estimatedCostUsd: 0.00246,
    });
  });

  it("当 cachedTokens > promptTokens 时会先 clamp 再计算费用", () => {
    const usage = buildSkillRunUsage({
      modelPricingByModel: new Map([
        [
          "gpt-5.2",
          {
            promptPer1kTokens: 0.001,
            completionPer1kTokens: 0.002,
            cachedInputPricePer1kTokens: 0.004,
          },
        ],
      ]),
      model: "gpt-5.2",
      promptTokens: 100,
      completionTokens: 50,
      cachedTokens: 300,
      sessionTotalTokens: 150,
    });

    expect(usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 50,
      cachedTokens: 100,
      sessionTotalTokens: 150,
      estimatedCostUsd: 0.0005,
    });
  });
});

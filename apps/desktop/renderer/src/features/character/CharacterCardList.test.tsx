import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CharacterCardList,
  type CharacterCardSummary,
} from "./CharacterCardList";

describe("CharacterCardList", () => {
  it("should render avatar placeholder name type attributes and relation summary", () => {
    const cards: CharacterCardSummary[] = [
      {
        id: "c-1",
        name: "林远",
        typeLabel: "角色",
        keyAttributes: ["年龄: 28", "性格: 冷静"],
        relationSummary: "关系 3 条",
      },
    ];

    render(<CharacterCardList cards={cards} />);

    expect(screen.getByText("林远")).toBeInTheDocument();
    expect(screen.getByText("角色")).toBeInTheDocument();
    expect(screen.getByText("年龄: 28")).toBeInTheDocument();
    expect(screen.getByText("性格: 冷静")).toBeInTheDocument();
    expect(screen.getByText("关系 3 条")).toBeInTheDocument();
    expect(screen.getByText("林")).toBeInTheDocument();
  });
});

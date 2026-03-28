import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  // 防回归：Input 必须渲染为可输入的 textbox
  it("renders as a textbox", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // 防回归：用户输入必须反映在 value 中
  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    expect(input).toHaveValue("Hello");
  });

  // 防回归：disabled 状态必须阻止输入
  it("is non-editable when disabled", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  // 防回归：error 状态必须通过 aria-invalid 表达
  it("exposes error state via aria-invalid", () => {
    render(<Input aria-invalid="true" />);
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  // 防回归：onChange 回调必须正常触发
  it("calls onChange on input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), "A");
    expect(onChange).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageUpload } from "./ImageUpload";

describe("ImageUpload", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染上传区域", () => {
      render(<ImageUpload />);

      expect(screen.getByTestId("image-upload")).toBeInTheDocument();
    });

    it("应该显示 placeholder 文案", () => {
      render(<ImageUpload placeholder="Click to upload" />);

      expect(screen.getByText("Click to upload")).toBeInTheDocument();
    });

    it("应该显示 hint 文案", () => {
      render(<ImageUpload hint="PNG, JPG up to 5MB" />);

      expect(screen.getByText("PNG, JPG up to 5MB")).toBeInTheDocument();
    });

    it("应该渲染隐藏的 file input", () => {
      render(<ImageUpload />);

      const input = screen.getByTestId("image-upload-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass("hidden");
    });
  });

  // ===========================================================================
  // 预览测试
  // ===========================================================================
  describe("预览", () => {
    it("传入 URL 时应该显示预览图", () => {
      render(<ImageUpload value="https://example.com/image.jpg" />);

      const img = screen.getByAltText("Preview");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("预览状态应该显示移除按钮", () => {
      render(<ImageUpload value="https://example.com/image.jpg" />);

      expect(screen.getByTestId("image-upload-remove")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击应该触发 file input", async () => {
      const user = userEvent.setup();
      render(<ImageUpload />);

      const uploadArea = screen.getByTestId("image-upload");
      const input = screen.getByTestId("image-upload-input");

      const clickSpy = vi.spyOn(input, "click");

      await user.click(uploadArea);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("选择文件应该调用 onChange", async () => {
      const onChange = vi.fn();
      render(<ImageUpload onChange={onChange} />);

      const input = screen.getByTestId("image-upload-input");
      const file = new File(["test"], "test.png", { type: "image/png" });

      fireEvent.change(input, { target: { files: [file] } });

      expect(onChange).toHaveBeenCalledWith(file);
    });

    it("点击移除按钮应该调用 onChange(null)", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ImageUpload
          value="https://example.com/image.jpg"
          onChange={onChange}
        />,
      );

      await user.click(screen.getByTestId("image-upload-remove"));

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  // ===========================================================================
  // 验证测试
  // ===========================================================================
  describe("验证", () => {
    it("非图片文件应该调用 onError", () => {
      const onError = vi.fn();
      render(<ImageUpload onError={onError} />);

      const input = screen.getByTestId("image-upload-input");
      const file = new File(["test"], "test.txt", { type: "text/plain" });

      fireEvent.change(input, { target: { files: [file] } });

      expect(onError).toHaveBeenCalledWith("Please select an image file");
    });

    it("超过大小限制应该调用 onError", () => {
      const onError = vi.fn();
      render(<ImageUpload maxSize={1024} onError={onError} />); // 1KB limit

      const input = screen.getByTestId("image-upload-input");
      // Create a file larger than 1KB
      const largeContent = new Array(2000).fill("a").join("");
      const file = new File([largeContent], "large.png", { type: "image/png" });

      fireEvent.change(input, { target: { files: [file] } });

      expect(onError).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 禁用测试
  // ===========================================================================
  describe("禁用", () => {
    it("禁用时应该有 disabled 样式", () => {
      render(<ImageUpload disabled />);

      const uploadArea = screen.getByTestId("image-upload");
      expect(uploadArea).toHaveAttribute("aria-disabled", "true");
    });

    it("禁用时点击不应该触发 file input", async () => {
      const user = userEvent.setup();
      render(<ImageUpload disabled />);

      const uploadArea = screen.getByTestId("image-upload");
      const input = screen.getByTestId("image-upload-input");

      const clickSpy = vi.spyOn(input, "click");

      await user.click(uploadArea);

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 拖拽测试
  // ===========================================================================
  describe("拖拽", () => {
    it("拖拽文件进入应该改变样式", () => {
      render(<ImageUpload />);

      const uploadArea = screen.getByTestId("image-upload");

      fireEvent.dragEnter(uploadArea, {
        dataTransfer: { files: [] },
      });

      // 拖拽状态样式变化 - 检查是否包含 accent 边框色
      expect(uploadArea).toHaveClass("border-[var(--color-accent)]");
    });

    it("拖拽离开应该恢复样式", () => {
      render(<ImageUpload />);

      const uploadArea = screen.getByTestId("image-upload");

      fireEvent.dragEnter(uploadArea, {
        dataTransfer: { files: [] },
      });

      fireEvent.dragLeave(uploadArea, {
        dataTransfer: { files: [] },
      });

      expect(uploadArea).not.toHaveClass("border-[var(--color-accent)]");
    });

    it("放下文件应该调用 onChange", () => {
      const onChange = vi.fn();
      render(<ImageUpload onChange={onChange} />);

      const uploadArea = screen.getByTestId("image-upload");
      const file = new File(["test"], "test.png", { type: "image/png" });

      fireEvent.drop(uploadArea, {
        dataTransfer: { files: [file] },
      });

      expect(onChange).toHaveBeenCalledWith(file);
    });
  });

  // ===========================================================================
  // 键盘导航测试
  // ===========================================================================
  describe("键盘导航", () => {
    it("应该可以通过 Tab 聚焦", async () => {
      const user = userEvent.setup();
      render(<ImageUpload />);

      await user.tab();

      expect(screen.getByTestId("image-upload")).toHaveFocus();
    });

    it("按 Enter 应该触发 file input", async () => {
      const user = userEvent.setup();
      render(<ImageUpload />);

      const uploadArea = screen.getByTestId("image-upload");
      const input = screen.getByTestId("image-upload-input");

      const clickSpy = vi.spyOn(input, "click");

      uploadArea.focus();
      await user.keyboard("{Enter}");

      expect(clickSpy).toHaveBeenCalled();
    });

    it("按 Space 应该触发 file input", async () => {
      const user = userEvent.setup();
      render(<ImageUpload />);

      const uploadArea = screen.getByTestId("image-upload");
      const input = screen.getByTestId("image-upload-input");

      const clickSpy = vi.spyOn(input, "click");

      uploadArea.focus();
      await user.keyboard(" ");

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});

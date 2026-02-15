import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { AppShell } from "../components/layout/AppShell";
import { LayoutTestWrapper } from "../components/layout/test-utils";
import { i18n, initializeI18n } from "../i18n";

vi.mock("../features/export/ExportDialog", () => {
  return {
    ExportDialog: (props: { documentTitle: string }) => {
      return <div data-testid="export-dialog-proxy">{props.documentTitle}</div>;
    },
  };
});

describe("App shell i18n bootstrap", () => {
  beforeEach(async () => {
    await initializeI18n();
    await i18n.changeLanguage("zh-CN");
  });

  it("app shell renders via i18n provider instead of hardcoded literal", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LayoutTestWrapper>
          <AppShell />
        </LayoutTestWrapper>
      </I18nextProvider>,
    );

    const bootstrapCopy = screen.getByTestId("export-dialog-proxy");
    expect(bootstrapCopy).toHaveTextContent("当前文档");
    expect(bootstrapCopy).not.toHaveTextContent("Current Document");
  });
});

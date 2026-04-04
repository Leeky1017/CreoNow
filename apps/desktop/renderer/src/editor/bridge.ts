import { baseKeymap } from "prosemirror-commands";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, Plugin, type Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import {
  createEnterTriggeredMarkdownPlugin,
  createEditorInputRulesPlugin,
  createSelectionRef,
  docFromJson,
  editorSchema,
  replaceSelectionWithPlainText,
  verifySelectionHash,
  type ProseMirrorJson,
  type SelectionRef,
} from "@/editor/schema";

const LINE_BREAK = String.fromCharCode(10);

export interface EditorBridgeOptions {
  onDocumentChange?: (content: ProseMirrorJson) => void;
  onSelectionChange?: (selection: SelectionRef | null) => void;
}

export type ReplaceSelectionResult =
  | { ok: true }
  | { ok: false; reason: "selection-changed" };

export interface EditorBridge {
  readonly view: EditorView | null;
  mount(container: HTMLElement, initialDoc?: unknown): void;
  destroy(): void;
  focus(): void;
  getContent(): ProseMirrorJson;
  getCursorContext(): { cursorPosition: number; precedingText: string } | null;
  getSelection(): SelectionRef | null;
  setEditable(editable: boolean): void;
  setContent(content: unknown): void;
  replaceSelection(selection: SelectionRef, nextText: string): ReplaceSelectionResult;
  getTextContent(): string;
}

function createSelectionFromView(view: EditorView): SelectionRef | null {
  const { from, to, empty } = view.state.selection;
  if (empty || from === to) {
    return null;
  }

  const text = view.state.doc.textBetween(from, to, LINE_BREAK, LINE_BREAK);
  return createSelectionRef({ from, to, text });
}

function createPlugins(onSelectionChange?: (selection: SelectionRef | null) => void): Plugin[] {
  return [
    history(),
    createEditorInputRulesPlugin(editorSchema),
    createEnterTriggeredMarkdownPlugin(editorSchema),
    keymap(baseKeymap),
    new Plugin({
      view(view) {
        onSelectionChange?.(createSelectionFromView(view));
        return {
          update(nextView, previousState) {
            if (previousState.selection.eq(nextView.state.selection) === false) {
              onSelectionChange?.(createSelectionFromView(nextView));
            }
          },
        };
      },
    }),
  ];
}

function createState(initialDoc: unknown, onSelectionChange?: (selection: SelectionRef | null) => void): EditorState {
  return EditorState.create({
    schema: editorSchema,
    doc: docFromJson(initialDoc),
    plugins: createPlugins(onSelectionChange),
  });
}

export function createEditorBridge(options: EditorBridgeOptions = {}): EditorBridge {
  let view: EditorView | null = null;
  let currentContainer: HTMLElement | null = null;
  let editable = true;

  const notifyDocumentChange = (state: EditorState): void => {
    options.onDocumentChange?.(state.doc.toJSON());
  };

  const dispatchTransaction = (transaction: Transaction): void => {
    if (view === null) {
      return;
    }

    const nextState = view.state.apply(transaction);
    view.updateState(nextState);

    if (transaction.docChanged) {
      notifyDocumentChange(nextState);
    }
  };

  return {
    get view() {
      return view;
    },

    mount(container, initialDoc = null) {
      currentContainer = container;
      if (view !== null) {
        this.destroy();
      }

      view = new EditorView(container, {
        state: createState(initialDoc, options.onSelectionChange),
        dispatchTransaction,
        editable: () => editable,
        attributes: {
          class: "cn-editor-surface",
          spellcheck: "false",
          "aria-label": "CreoNow editor",
        },
      });

      notifyDocumentChange(view.state);
    },

    destroy() {
      if (view === null) {
        return;
      }

      view.destroy();
      view = null;
      if (currentContainer !== null) {
        currentContainer.textContent = "";
      }
      options.onSelectionChange?.(null);
    },

    focus() {
      view?.focus();
    },

    getContent() {
      return view?.state.doc.toJSON() ?? docFromJson(null).toJSON();
    },

    getCursorContext() {
      if (view === null) {
        return null;
      }

      const cursorPosition = view.state.selection.from;
      return {
        cursorPosition,
        precedingText: view.state.doc.textBetween(0, cursorPosition, LINE_BREAK, LINE_BREAK),
      };
    },

    getSelection() {
      if (view === null) {
        return null;
      }

      return createSelectionFromView(view);
    },

    setEditable(nextEditable) {
      editable = nextEditable;
      view?.setProps({
        editable: () => editable,
      });
    },

    setContent(content) {
      if (view === null) {
        return;
      }

      const nextState = createState(content, options.onSelectionChange);
      view.updateState(nextState);
      notifyDocumentChange(nextState);
    },

    replaceSelection(selection, nextText) {
      if (view === null) {
        return { ok: false, reason: "selection-changed" };
      }

      const currentText = view.state.doc.textBetween(
        selection.from,
        selection.to,
        LINE_BREAK,
        LINE_BREAK,
      );
      if (verifySelectionHash(selection, currentText) === false) {
        return { ok: false, reason: "selection-changed" };
      }

      const transaction = view.state.tr;
      replaceSelectionWithPlainText({
        tr: transaction,
        selection,
        text: nextText,
      });
      dispatchTransaction(transaction);
      return { ok: true };
    },

    getTextContent() {
      return view?.state.doc.textContent ?? "";
    },
  };
}

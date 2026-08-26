import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { closeHistory } from "@tiptap/pm/history";

/**
 * Makes undo step through text the way Gmail does, instead of swallowing
 * everything typed in one burst.
 *
 * ProseMirror's history groups every change that lands within `newGroupDelay`
 * (500ms by default) of the previous one into a single undo event. Continuous
 * typing never pauses that long, so a whole paragraph becomes one step and a
 * single Ctrl+Z wipes all of it — which is exactly the complaint.
 *
 * Shortening the delay alone is the wrong fix: it makes undo granularity depend
 * on typing speed, so a fast typist still loses a sentence and a slow one undoes
 * letter by letter. Gmail and Docs break on *word boundaries*, which is a
 * property of the text rather than of the clock. So does this: after a
 * separator is typed, an empty transaction carrying prosemirror-history's
 * `closeHistory` flag ends the current group, and the next word starts its own.
 *
 * The extra transaction has no steps, so Tiptap does not fire `onUpdate` for it
 * (it requires `transactions.some(tr => tr.docChanged)`) and the compose
 * autosave is left alone.
 */

// Spaces, Arabic and Latin punctuation, and brackets. Anything that ends a word
// in the prose people actually write here.
const WORD_BOUNDARY = /[\s.,،؛;:!؟?_\-—–()[\]{}"'«»/\\|]/;

export const GranularUndo = Extension.create({
  name: "granularUndo",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("granularUndo"),

        props: {
          // Fires for typed characters, not for Enter or Backspace.
          handleTextInput(view, _from, _to, text) {
            if (!WORD_BOUNDARY.test(text)) return false;
            breakGroupAfterCurrentTransaction(view);
            return false; // let the character insert normally
          },

          handleKeyDown(view, event) {
            // Enter ends a line, which is at least as strong a boundary as a
            // space. Backspace is left alone on purpose: holding it down should
            // still undo as one deletion rather than character by character.
            if (event.key === "Enter") breakGroupAfterCurrentTransaction(view);
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Closes the undo group *after* the transaction currently being handled, so the
 * separator stays attached to the word it terminates rather than starting the
 * next group with it.
 */
function breakGroupAfterCurrentTransaction(view: EditorView) {
  queueMicrotask(() => {
    if (view.isDestroyed) return;
    view.dispatch(closeHistory(view.state.tr));
  });
}

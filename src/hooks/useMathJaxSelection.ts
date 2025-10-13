import { useEffect, useRef } from 'react';

/**
 * Highlights MathJax CHTML blocks (mjx-container) that intersect the current selection.
 * - Limits work to an optional root container
 * - Supports multi-range selections
 * - Coalesces rapid events via requestAnimationFrame
 */
export const useMathJaxSelection = (opts?: { root?: HTMLElement | string }) => {
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const getRoot = (): HTMLElement | Document => {
      if (!opts?.root) return document;
      if (typeof opts.root === 'string') {
        const el = document.querySelector(opts.root);
        return (el as HTMLElement) ?? document;
      }
      return opts.root;
    };

    const clearHighlights = (root: HTMLElement | Document) => {
      (root instanceof Document ? root : root.ownerDocument || document)
        .querySelectorAll('mjx-container.mjx-selected')
        .forEach(el => el.classList.remove('mjx-selected'));
    };

    const markWithinRange = (range: Range, root: HTMLElement | Document) => {
      // Fast-path: walk from the common ancestor and climb to nearest mjx-container.
      const doc = root instanceof Document ? root : document;
      const containers = new Set<HTMLElement>();

      // Collect anchor/focus containers (covers most cases cheaply)
      const sel = doc.getSelection?.();
      if (sel) {
        const addClosest = (n: Node | null) => {
          if (!n) return;
          const el = (n.nodeType === 3 ? (n.parentElement) : (n as Element)) as Element | null;
          const c = el?.closest?.('mjx-container') as HTMLElement | null;
          if (c) containers.add(c);
        };
        for (let i = 0; i < sel.rangeCount; i++) {
          const r = sel.getRangeAt(i);
          addClosest(r.startContainer);
          addClosest(r.endContainer);
        }
      }

      // Fallback: check visible mjx within root via TreeWalker (cheaper than querySelectorAll on huge docs)
      const walker = document.createTreeWalker(
        (root as HTMLElement) instanceof HTMLElement ? (root as HTMLElement) : document.body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node) {
            // Only consider mjx-container and skip deep DOM
            return (node.nodeName.toLowerCase() === 'mjx-container')
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          }
        }
      );
      let node: Node | null = walker.currentNode;
      while ((node = walker.nextNode())) {
        const el = node as HTMLElement;
        // Quick reject: if it's way offscreen and you want to save even more work, you can skip by rects.
        if (range.intersectsNode(el)) containers.add(el);
      }

      containers.forEach(el => el.classList.add('mjx-selected'));
    };

    const compute = () => {
      rafId.current = null;
      const root = getRoot();
      clearHighlights(root);

      const sel = (root instanceof Document ? root : document).getSelection?.();
      if (!sel || sel.rangeCount === 0) return;

      // Mark for each range (Firefox can have multiple)
      for (let i = 0; i < sel.rangeCount; i++) {
        const range = sel.getRangeAt(i);
        if (!range.collapsed) {
          markWithinRange(range, root);
        }
      }
    };

    const schedule = () => {
      if (rafId.current != null) return;
      rafId.current = requestAnimationFrame(compute);
    };

    const onSelectionChange = schedule;
    const onMouseUp = schedule;
    const onKeyUp = (e: KeyboardEvent) => {
      // shift-selection, cmd/ctrl+A, etc. rAF batch is sufficient
      if (e.shiftKey || (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey))) schedule();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
      // best-effort cleanup
      const root = getRoot();
      (root instanceof Document ? root : document)
        .querySelectorAll('mjx-container.mjx-selected')
        .forEach(el => el.classList.remove('mjx-selected'));
    };
  }, [opts?.root]);
};

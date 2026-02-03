import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from "@/lib/utils";

const FormulaInput = forwardRef(({ value, onChange, className }, ref) => {
  const containerRef = useRef(null);
  const isInternalUpdate = useRef(false);

  // Convert raw string to HTML with blue pills
  const formatToHtml = (str) => {
    if (!str) return '';
    // Escape HTML first to prevent injection
    const safelyEscaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Replace [Column text] with span
    return safelyEscaped.replace(/\[([^\]]+)\]/g, (match, p1) => {
      // data-tag attribute stores the clean value
      // Added &#8203; (Zero Width Space) after span to ensure cursor can be placed after it
      return `<span class="bg-blue-100 text-blue-700 px-0.5 py-0 rounded text-[10px] font-medium border border-blue-200 select-none mx-0.5 align-middle inline-block my-0.5" contenteditable="false" data-tag="${p1}">${p1}</span>&#8203;`; 
    });
  };

  // Sync value to innerHTML
  useEffect(() => {
    if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
    }
    
    if (containerRef.current) {
        // Construct current string value from DOM to compare
        // This prevents cursor jumping when the semantic value hasn't changed
        let currentDomValue = '';
        containerRef.current.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                currentDomValue += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-tag')) {
                currentDomValue += `[${node.getAttribute('data-tag')}]`;
            } else {
                 currentDomValue += node.textContent;
            }
        });

        // Clean invisible characters for comparison
        currentDomValue = currentDomValue.replace(/\u200B/g, '');

        if (currentDomValue !== value) {
             containerRef.current.innerHTML = formatToHtml(value || '');
        }
    }
  }, [value]);

  const handleInput = () => {
    isInternalUpdate.current = true;
    
    let newValue = '';
    const nodes = containerRef.current.childNodes;
    nodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            newValue += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute('data-tag')) {
                newValue += `[${node.getAttribute('data-tag')}]`;
            } else {
                // Handle <br> or other inserted nodes simply as text if possible, or ignore
                if (node.tagName === 'BR') {
                    // newValue += '\n'; // Formulas usually single line, maybe ignore or space
                } else {
                    newValue += node.textContent;
                }
            }
        }
    });

    // Clean up invisible characters and normalize spaces
    newValue = newValue.replace(/\u200B/g, ''); // Remove zero width spaces
    newValue = newValue.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
    
    onChange(newValue);
  };

  useImperativeHandle(ref, () => ({
      insertTag: (tagName) => {
          if (!containerRef.current) return;
          
          containerRef.current.focus();
          
          const selection = window.getSelection();
          let range;
          
          if (selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
              // Ensure range is inside this input
              if (!containerRef.current.contains(range.commonAncestorContainer)) {
                  range = null;
              }
          }

          if (!range) {
              // Append to end
              range = document.createRange();
              range.selectNodeContents(containerRef.current);
              range.collapse(false);
          }
          
          // Create the tag element
          const span = document.createElement('span');
          span.className = "bg-blue-100 text-blue-700 px-0.5 py-0 rounded text-[11px] font-medium border border-blue-200 select-none mx-0.5 align-middle inline-block my-0.5";
          span.contentEditable = "false";
          span.setAttribute('data-tag', tagName);
          span.innerText = tagName;
          
          range.deleteContents();
          range.insertNode(span);
          
          // Add zero-width space after
          const space = document.createTextNode('\u200B'); 
          range.setStartAfter(span);
          range.insertNode(space);
          
          // Move cursor
          range.setStartAfter(space);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          handleInput();
      },
      insertText: (text) => {
          if (!containerRef.current) return;
          containerRef.current.focus();

          const selection = window.getSelection();
          let range;
          
          if (selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
              if (!containerRef.current.contains(range.commonAncestorContainer)) range = null;
          }

          if (!range) {
              range = document.createRange();
              range.selectNodeContents(containerRef.current);
              range.collapse(false);
          }
          
          const textNode = document.createTextNode(text);
          range.deleteContents();
          range.insertNode(textNode);
          
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          handleInput();
      }
  }));

  return (
    <div
        ref={containerRef}
        className={cn(
            "flex min-h-[2.5rem] w-full flex-wrap items-center rounded-md border border-input bg-slate-50 px-3 py-2 text-xs ring-offset-background  disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            className
        )}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent new lines in formula
            }
        }}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'text' }}
        suppressContentEditableWarning={true}
    />
  );
});

FormulaInput.displayName = "FormulaInput";

export default FormulaInput;
"use client";

// Under role, context and example of a harness started from a template: the
// template's own text for that part, folded, to read while writing one's own
// (the field's placeholder disappears at the first keystroke).

export function TemplateHint({ text }: { text: string }) {
  return (
    <details className="group text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-bold text-gray-700 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        템플릿에서는 이렇게 썼어요
      </summary>
      <p className="nb-flat mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words bg-[var(--background)] px-3 py-2.5 leading-relaxed text-gray-700">
        {text}
      </p>
    </details>
  );
}

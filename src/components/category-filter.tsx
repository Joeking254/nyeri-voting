"use client";

type CategoryFilterProps = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const allOptions = ["All", ...categories];

  return (
    <nav
      className="sticky top-[61px] z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90"
      aria-label="Filter nominees by category"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-8">
        {allOptions.map((category) => {
          const isSelected = selected === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(category)}
              className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold tracking-wide transition-all ${
                isSelected
                  ? "bg-slate-950 text-white shadow-md dark:bg-white dark:text-slate-950"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

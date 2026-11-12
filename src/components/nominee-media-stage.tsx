"use client";

import { useState } from "react";
import { CheckCircle2, ZoomIn, X } from "lucide-react";

interface NomineeMediaStageProps {
  photoUrl: string | null;
  displayName: string;
  categoryName?: string;
  isVerified: boolean;
  photoPosition?: string;
}

export function NomineeMediaStage({
  photoUrl,
  displayName,
  categoryName,
  isVerified,
  photoPosition = "top",
}: NomineeMediaStageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!photoUrl) {
    return (
      <div className="relative flex aspect-[4/5] min-h-[380px] sm:min-h-[460px] md:aspect-auto md:min-h-[540px] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 text-8xl font-black text-slate-400 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 dark:text-slate-600">
        <span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
        {isVerified && (
          <span className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/75 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-4 fill-sky-500 text-white" />
            Verified Creator
          </span>
        )}
      </div>
    );
  }

  // Smart autocrop: focuses on the face/subject so no heads are cut off
  const objectPos =
    photoPosition === "bottom"
      ? "center bottom"
      : photoPosition === "center"
      ? "center 20%"
      : "center top";

  return (
    <>
      <div className="group relative flex aspect-[4/5] min-h-[400px] sm:min-h-[480px] md:aspect-auto md:min-h-[560px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* Edge-to-Edge Autocrop Image (clean, no black borders or edges) */}
        <img
          src={photoUrl}
          alt={displayName}
          onClick={() => setIsLightboxOpen(true)}
          style={{ objectPosition: objectPos }}
          className="size-full cursor-zoom-in object-cover transition-transform duration-500 hover:scale-105"
        />

        {/* Subtle shadow overlay at top and bottom for pill legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

        {/* Category Pill Overlay */}
        {categoryName && (
          <span className="absolute left-3 top-3 z-20 max-w-[calc(100%-70px)] truncate rounded-full border border-white/25 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
            {categoryName}
          </span>
        )}

        {/* Zoom Lightbox Trigger Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full border border-white/25 bg-slate-950/75 text-white/90 shadow-md backdrop-blur-md transition-colors hover:bg-slate-950 hover:text-white"
          title="View Full Uncropped Photo"
          aria-label="View Full Uncropped Photo"
        >
          <ZoomIn className="size-4" />
        </button>

        {/* Verified Pill Overlay */}
        {isVerified && (
          <span className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-4 fill-sky-500 text-white" />
            Verified Creator
          </span>
        )}
      </div>

      {/* Lightbox Modal (click to inspect entire original image) */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-5 top-5 z-50 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Close photo preview"
          >
            <X className="size-5" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photoUrl}
              alt={displayName}
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain drop-shadow-2xl"
            />
            <p className="mt-2 text-center text-xs font-medium text-slate-300">
              {displayName} &bull; Full Uncropped Photo
            </p>
          </div>
        </div>
      )}
    </>
  );
}

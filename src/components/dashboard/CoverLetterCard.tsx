"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CoverLetter } from "@/lib/schema";
import {
  Mail,
  Copy,
  Trash2,
  Edit3,
  Calendar,
  MoreVertical,
} from "lucide-react";

interface CoverLetterCardProps {
  coverLetter: CoverLetter;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const CoverLetterCard: React.FC<CoverLetterCardProps> = ({
  coverLetter,
  onDuplicate,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      className={`group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-lg transition-all flex flex-col relative ${
        isMenuOpen ? "z-30" : "z-10"
      }`}
    >
      <Link
        href={`/cover-letter/${coverLetter.id}`}
        className="h-40 bg-neutral-100 dark:bg-neutral-950 p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-center relative overflow-hidden rounded-t-2xl group-hover:bg-neutral-50 dark:group-hover:bg-neutral-900/50 transition-colors"
      >
        <div className="w-28 h-32 bg-white dark:bg-neutral-900 rounded-sm shadow-md p-3 flex flex-col gap-1.5 border border-neutral-200 dark:border-neutral-700">
          <div className="w-12 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-xs" />
          <div className="w-16 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-xs" />
          <div className="border-b border-neutral-100 dark:border-neutral-800 my-1" />
          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-4/5 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-3/4 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {coverLetter.title}
            </h3>
            <p className="text-xs text-neutral-500 truncate mt-0.5">
              To: {coverLetter.recipient.company || coverLetter.recipient.name || "Hiring Team"}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-40 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-neutral-400" />
            {coverLetter.date}
          </span>

          <Link
            href={`/cover-letter/${coverLetter.id}`}
            className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Edit Letter →
          </Link>
        </div>
      </div>
    </div>
  );
};

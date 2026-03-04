"use client";

import { useCallback, useState } from "react";
import Image from "next/image";

import { listingImageAlt } from "@/lib/image-alt";

type Props = {
  images: string[];
  title?: string;
};

export default function ListingGallery({ images, title }: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const imgList = images ?? [];

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button type="button" onClick={() => openAt(0)} className="block w-full">
          <Image
            src={imgList[0] || "/placeholders/car.svg"}
            alt={listingImageAlt(title)}
            width={1200}
            height={800}
            className="h-80 w-full object-cover"
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {imgList.slice(0, 8).map((src, i) => (
          <div key={`${src}-${i}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button type="button" onClick={() => openAt(i)} className="block w-full">
              <Image
                src={src}
                alt={listingImageAlt(title, i + 1)}
                width={1200}
                height={800}
                className="h-48 w-full object-cover"
              />
            </button>
          </div>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl">
            <div className="rounded-2xl bg-white p-4">
              <div className="mb-3 flex justify-end">
                <button onClick={() => setOpen(false)} className="px-3 py-1 text-sm text-slate-700">Fechar</button>
              </div>
              <div className="w-full">
                <img src={imgList[index]} alt={listingImageAlt(title, index + 1)} className="max-h-[80vh] w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

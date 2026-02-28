"use client";

import { useCallback, useState } from "react";
import Image from "next/image";

import { listingImageAlt } from "@/lib/image-alt";

type Props = {
  images: string[];
  title?: string;
  mediaVideoUrl?: string | null;
  mediaVideoType?: "youtube" | "upload" | undefined;
  mediaVideoPosition?: number | undefined;
};

export default function ListingGallery({ images, title, mediaVideoUrl, mediaVideoType, mediaVideoPosition }: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const items: { type: "image" | "video"; src: string }[] = [];
  const imgList = images ?? [];

  // build items array inserting video at specified position (0-based after cover)
  const pos = typeof mediaVideoPosition === "number" ? Math.max(0, Math.min(mediaVideoPosition, imgList.length)) : -1;

  for (let i = 0; i < imgList.length; i++) {
    if (i === pos) {
      if (mediaVideoUrl) items.push({ type: "video", src: mediaVideoUrl });
    }
    items.push({ type: "image", src: imgList[i] });
  }
  if (pos === -1 && mediaVideoUrl) items.push({ type: "video", src: mediaVideoUrl });

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items[0]?.type === "image" ? (
          <button type="button" onClick={() => openAt(0)} className="block w-full">
            <Image
              src={items[0]?.src || "/placeholders/car.svg"}
              alt={listingImageAlt(title)}
              width={1200}
              height={800}
              className="h-80 w-full object-cover"
            />
          </button>
        ) : (
          <div className="w-full bg-black">
            {mediaVideoType === "youtube" ? (
              <iframe
                title={title || "Vídeo do anúncio"}
                src={mediaVideoUrl || undefined}
                className="h-80 w-full"
                allowFullScreen
              />
            ) : (
              <video controls className="h-80 w-full bg-black">
                <source src={mediaVideoUrl || undefined} />
                Seu navegador não suporta video.
              </video>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {items.slice(0, 8).map((item, i) => (
          <div key={`${item.src}-${i}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {item.type === "image" ? (
              <button type="button" onClick={() => openAt(i)} className="block w-full">
                <Image
                  src={item.src}
                  alt={listingImageAlt(title, i + 1)}
                  width={1200}
                  height={800}
                  className="h-48 w-full object-cover"
                />
              </button>
            ) : (
              <button type="button" onClick={() => openAt(i)} className="block w-full">
                <div className="h-48 w-full bg-black flex items-center justify-center text-white text-sm">Video</div>
              </button>
            )}
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
                {items[index]?.type === "image" ? (
                  <img src={items[index].src} alt={listingImageAlt(title, index + 1)} className="max-h-[80vh] w-full object-contain" />
                ) : (
                  mediaVideoType === "youtube" ? (
                    <iframe title={title || "Vídeo do anúncio"} src={items[index].src} className="h-[68vh] w-full" allowFullScreen />
                  ) : (
                    <video controls className="h-[68vh] w-full bg-black">
                      <source src={items[index].src} />
                      Seu navegador não suporta video.
                    </video>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

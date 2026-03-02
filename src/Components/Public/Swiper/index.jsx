"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Virtual } from "swiper/modules";

const CustomSwiper = ({
  slides,
  setActiveSlide,
  slideTo,
  viewMode,
  albums,
  onAddToAlbum,
  onRemoveFromAlbum,
  onEnterCarousel,
}) => {
  const [swiper, updateSwiper] = useState({});
  const [showSlide, showSlideUpdate] = useState(false);
  const [loadedMap, setLoadedMap] = useState({});
  const [albumMenuOpen, setAlbumMenuOpen] = useState(null);

  useEffect(() => {
    if (swiper.slideTo) {
      swiper.slideTo(slideTo);
    }
  }, [swiper, slides, slideTo]);

  const initSwiper = (event) => {
    updateSwiper(event);
    let localSwiper = event;
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        localSwiper.slideNext();
      } else if (event.key === "ArrowLeft") {
        localSwiper.slidePrev();
      }

      if (event.code === "ArrowUp") {
        showSlideUpdate((state) => !state);
      }
    });
  };

  const handleAddToAlbum = (slide, albumName) => {
    if (albumName === "__remove__") {
      onRemoveFromAlbum?.(slide);
      setAlbumMenuOpen(null);
      return;
    }
    onAddToAlbum?.(slide, albumName);
    setAlbumMenuOpen(null);
  };

  return (
    <div className="h-[calc(100svh-110px)] sm:h-[calc(100svh-120px)] px-8 sm:px-10 lg:px-16 pb-14 sm:pb-16">
      <div className="h-full rounded-[32px] border border-slate-800/70 bg-slate-950/70 backdrop-blur">
        {viewMode === "grid" && slides.length > 0 ? (
          <div className="h-full overflow-y-auto px-4 sm:px-8 py-6">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id || slide.url}
                  className="group relative cursor-pointer rounded-3xl border border-slate-800/70 bg-slate-900/40 p-3 transition hover:border-emerald-400/40"
                  onClick={() => onEnterCarousel?.(index)}
                >
                  <img
                    src={slide.url}
                    alt={slide.title || "Album image"}
                    className="h-72 w-full rounded-2xl object-cover sm:h-80"
                    loading="lazy"
                  />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="text-xs text-slate-300">
                      {slide.title || "Untitled"}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-200"
                        onClick={() =>
                          setAlbumMenuOpen((state) =>
                            state === (slide.id || slide.url)
                              ? null
                              : slide.id || slide.url
                          )
                        }
                        onMouseDown={(event) => event.stopPropagation()}
                        onClickCapture={(event) => event.stopPropagation()}
                      >
                        Add
                      </button>
                      {albumMenuOpen === (slide.id || slide.url) && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 text-xs">
                          {albums.length === 0 ? (
                            <div className="px-3 py-2 text-slate-400">
                              No albums
                            </div>
                          ) : (
                            albums.map((album) => (
                              <button
                                key={album.name}
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                                onClick={() => handleAddToAlbum(slide, album.name)}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClickCapture={(event) => event.stopPropagation()}
                              >
                                {album.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {viewMode === "grid" && (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-rose-200"
                      onClick={() => handleAddToAlbum(slide, "__remove__")}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClickCapture={(event) => event.stopPropagation()}
                    >
                      Remove from album
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination, Virtual]}
            virtual={{ addSlidesBefore: 1, addSlidesAfter: 1 }}
            navigation={true}
            spaceBetween={0}
            className="h-full"
            slidesPerView={1}
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            initialSlide={0}
            onSlideChange={() => setActiveSlide(swiper.activeIndex)}
            onSwiper={(event) => initSwiper(event)}
          >
            {slides.length === 0 ? (
              <SwiperSlide className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="max-w-xl text-balance">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
                    Start by searching
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-semibold">
                    Add a collection or enter a subreddit name.
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Use the panel to create collections, sync with Google Drive,
                    and jump between stacks.
                  </p>
                </div>
              </SwiperSlide>
            ) : (
              slides.map((slide, index) => {
                const isLoaded = Boolean(loadedMap[slide.id]);
                const titleText = slide.subreddit
                  ? `${slide.title} - r/${slide.subreddit}`
                  : slide.title;
                const postUrl = slide.permalink
                  ? `https://www.reddit.com${slide.permalink}`
                  : null;
                return (
                  <SwiperSlide
                    key={slide.id}
                    virtualIndex={index}
                    className="flex h-full flex-col items-center justify-center gap-4 px-2 sm:px-6"
                  >
                    {postUrl ? (
                      <a
                        className={`text-center text-sm sm:text-base font-semibold tracking-tight text-slate-100 transition-opacity ${
                          showSlide ? "opacity-0" : "opacity-100"
                        }`}
                        href={postUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {titleText}
                      </a>
                    ) : (
                      <h2
                        className={`text-center text-sm sm:text-base font-semibold tracking-tight text-slate-100 transition-opacity ${
                          showSlide ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        {titleText}
                      </h2>
                    )}
                    <div className="relative flex w-full items-center justify-center px-2 sm:px-4">
                      {!isLoaded && (
                        <div className="absolute inset-0 grid place-items-center rounded-3xl bg-slate-900/70 text-xs uppercase tracking-[0.35em] text-emerald-300">
                          Loading image
                        </div>
                      )}
                      <img
                        src={slide.url}
                        className={`max-h-[60vh] sm:max-h-[68vh] lg:max-h-[72vh] max-w-[85vw] lg:max-w-[78vw] h-auto w-auto rounded-3xl object-contain shadow-[0_25px_80px_rgba(0,0,0,0.55)] transition-opacity duration-300 ${
                          !isLoaded ? "opacity-0" : "opacity-100"
                        } ${showSlide ? "opacity-0" : ""}`}
                        loading="lazy"
                        onLoad={() =>
                          setLoadedMap((state) => ({
                            ...state,
                            [slide.id]: true,
                          }))
                        }
                        onError={() =>
                          setLoadedMap((state) => ({
                            ...state,
                            [slide.id]: true,
                          }))
                        }
                        alt={slide.title || "Reddit image"}
                      />
                      <div className="absolute right-3 top-3">
                        <div className="relative">
                          <button
                            type="button"
                            className="rounded-full border border-slate-700/70 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-200"
                            onClick={() =>
                              setAlbumMenuOpen((state) =>
                                state === slide.id ? null : slide.id
                              )
                            }
                          >
                            Add to album
                          </button>
                          {albumMenuOpen === slide.id && (
                            <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 text-xs">
                              {albums.length === 0 ? (
                                <div className="px-3 py-2 text-slate-400">
                                  No albums
                                </div>
                              ) : (
                                albums.map((album) => (
                                  <button
                                    key={album.name}
                                    type="button"
                                    className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800/60"
                                    onClick={() =>
                                      handleAddToAlbum(slide, album.name)
                                    }
                                  >
                                    {album.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.25em] text-slate-400 transition-opacity ${
                        showSlide ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      {slide.subreddit && (
                        <span className="rounded-full border border-slate-700/70 px-3 py-1">
                          r/{slide.subreddit}
                        </span>
                      )}
                      {slide.author && (
                        <span className="rounded-full border border-slate-700/70 px-3 py-1">
                          u/{slide.author}
                        </span>
                      )}
                    </div>
                  </SwiperSlide>
                );
              })
            )}
          </Swiper>
        )}
      </div>
    </div>
  );
};

export default CustomSwiper;

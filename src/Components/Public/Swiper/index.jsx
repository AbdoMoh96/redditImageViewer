"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Virtual } from "swiper/modules";

const CustomSwiper = ({ slides, setActiveSlide, slideTo }) => {
  const [swiper, updateSwiper] = useState({});
  const [showSlide, showSlideUpdate] = useState(false);
  const [loadedMap, setLoadedMap] = useState({});

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

  return (
    <div className="h-[calc(100svh-110px)] sm:h-[calc(100svh-120px)] px-4 sm:px-6 lg:px-10 pb-8">
      <div className="h-full rounded-[32px] border border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <Swiper
          modules={[Navigation, Pagination, Virtual]}
          preloadImages={false}
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
                <h2 className="text-2xl sm:text-3xl font-semibold">Add a collection or enter a subreddit name.</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Use the panel to create collections, sync with Google Drive, and jump between stacks.
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
                  <div className="relative flex w-full max-w-5xl items-center justify-center px-2 sm:px-4">
                    {!isLoaded && (
                      <div className="absolute inset-0 grid place-items-center rounded-3xl bg-slate-900/70 text-xs uppercase tracking-[0.35em] text-emerald-300">
                        Loading image
                      </div>
                    )}
                    <img
                      src={slide.url}
                      className={`max-h-[68vh] w-full rounded-3xl object-contain shadow-[0_25px_80px_rgba(0,0,0,0.55)] transition-opacity duration-300 ${
                        !isLoaded ? "opacity-0" : "opacity-100"
                      } ${showSlide ? "opacity-0" : ""}`}
                      loading="lazy"
                      onLoad={() =>
                        setLoadedMap((state) => ({ ...state, [slide.id]: true }))
                      }
                      onError={() =>
                        setLoadedMap((state) => ({ ...state, [slide.id]: true }))
                      }
                      alt={slide.title || "Reddit image"}
                    />
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
      </div>
    </div>
  );
};

export default CustomSwiper;

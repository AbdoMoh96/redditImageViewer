"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Virtual } from "swiper/modules";
import { Img } from "../../../Resources/Pages/HomePage/StyledComponents/style";

const CustomSwiper = ({ slides, setActiveSlide, slideTo }) => {
  const [swiper, updateSwiper] = useState({});
  const [showSlide, showSlideUpdate] = useState(false);
  const [loadedMap, setLoadedMap] = useState({});
  /*const [slideIndex , slideIndexUpdate] = useState(0);*/

  useEffect(() => {
    if (swiper.slideTo) {
      swiper.slideTo(slideTo);
    }
  }, [swiper, slides, slideTo]);

  const center = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "whitesmoke",
  };

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
    <Swiper
      modules={[Navigation, Pagination, Virtual]}
      preloadImages={false}
      virtual={{ addSlidesBefore: 1, addSlidesAfter: 1 }}
      navigation={true}
      spaceBetween={0}
      className="swiper_main_height"
      slidesPerView={1}
      pagination={{ clickable: true }}
      scrollbar={{ draggable: true }}
      initialSlide={0}
      onSlideChange={() =>  setActiveSlide(swiper.activeIndex)}
      onSwiper={(event) => initSwiper(event)}
    >
      {slides.map((slide, index) => {
        const isLoaded = Boolean(loadedMap[slide.id]);
        return (
          <SwiperSlide
            key={slide.id}
            virtualIndex={index}
            className=""
            style={center}
          >
            <h1 className={`${showSlide && "image_opacity"}`}>{slide.title}</h1>
            <div className="slide_image_wrapper">
              {!isLoaded && (
                <div className="slide_image_loader" aria-live="polite">
                  Loading image…
                </div>
              )}
              <Img
                src={slide.url}
                className={`slide_image ${!isLoaded ? "slide_image--hidden" : ""} ${showSlide && "image_opacity"}`}
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
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default CustomSwiper;

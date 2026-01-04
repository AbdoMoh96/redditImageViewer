import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Img } from "../../../Resources/Pages/HomePage/StyledComponents/style";

const CustomSwiper = ({ slides, setActiveSlide, slideTo }) => {
  const [swiper, updateSwiper] = useState({});
  const [showSlide, showSlideUpdate] = useState(false);
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
      modules={[Navigation, Pagination]}
      preloadImages={false}
      lazy={true}
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
      {slides.map((slide) => {
        return (
          <SwiperSlide key={slide.id} className="" style={center}>
            <h1 className={`${showSlide && "image_opacity"}`}>{slide.title}</h1>
            <Img
              src={slide.url}
              className={`${showSlide && "image_opacity"}`}
              loading="lazy"
            />
            <div className="swiper-lazy-preloader swiper-lazy-preloader-black"></div>
          </SwiperSlide>
        );
      })}
      ;
    </Swiper>
  );
};

export default CustomSwiper;

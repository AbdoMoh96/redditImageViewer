import React,{ useEffect , useState} from "react";
import { Swiper, SwiperSlide } from 'swiper/react/swiper-react';
import { Navigation, Pagination , Lazy } from 'swiper';
import 'swiper/swiper.scss'; // core Swiper
import 'swiper/modules/navigation/navigation.scss'; // Navigation module
import 'swiper/modules/pagination/pagination.scss';
import 'swiper/modules/lazy/lazy.scss';
import {Img} from "../../../Resources/Pages/HomePage/StyledComponents/style";  // lazy css


const CustomSwiper = ({slides}) => {
    const [swiper , updateSwiper] = useState({});
    const [showSlide , showSlideUpdate] = useState(false);
    /*const [slideIndex , slideIndexUpdate] = useState(0);*/


    useEffect(() => {
        if (swiper.slideTo) {
            swiper.slideTo(0);
        }
    }, [swiper, slides])

    const center = {
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      justifyContent:"center",
      color:"whitesmoke"
    };


    const initSwiper = (event) => {
        updateSwiper(event);
        let localSwiper = event;
        window.addEventListener('keydown', (event) => {
            if(event.key === 'ArrowRight'){
                localSwiper.slideNext();
            }else if(event.key === 'ArrowLeft'){
                localSwiper.slidePrev();
            }

            if(event.code === 'ArrowUp'){
                showSlideUpdate(state => !state);
            }
        });
    }


    return(
        <Swiper
            modules={[Navigation, Pagination , Lazy ]}
            preloadImages={false}
            lazy={true}
            spaceBetween={0}
            className="swiper_main_height"
            slidesPerView={1}
            navigation
            pagination={{ clickable: true}}
            scrollbar={{ draggable: true }}
            initialSlide={0}
            onSwiper={(event) => initSwiper(event)}
        >
            {slides.map((slide) => {
                return <SwiperSlide key={slide.id} className="" style={center}>
                        <h1 className={`${showSlide && 'image_opacity'}`}>{slide.title}</h1>
                        <Img data-src={slide.url} className={`swiper-lazy ${showSlide && 'image_opacity'}`}/>
                        <div className="swiper-lazy-preloader swiper-lazy-preloader-black"></div>
                       </SwiperSlide>

            })};
        </Swiper>
    )
}

export default CustomSwiper;
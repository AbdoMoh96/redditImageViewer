"use client";

import React, { useState } from "react";
import Layout from "../Layout/Layout";
import Loader from "../Components/Pages/HomePage/Loader";
import Swiper from "../Components/Public/Swiper/index";
import Panel from "../Components/Pages/HomePage/Panel";

const HomePage = () => {
  const [loader, updateLoader] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideTo, setSlideToUpdate] = useState(0);
  const [images, imagesUpdate] = useState([]);

  return (
    <Layout>
      <Swiper slideTo={slideTo} setActiveSlide={setActiveSlide} slides={images} />
      <Panel
        loader={updateLoader}
        imagesUpdate={imagesUpdate}
        activeSlide={activeSlide}
        slideToUpdate={setSlideToUpdate}
      />
      {loader && <Loader />}
    </Layout>
  );
};

export default HomePage;

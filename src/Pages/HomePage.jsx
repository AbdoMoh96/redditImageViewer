"use client";

import React, { useRef, useState } from "react";
import Layout from "../Layout/Layout";
import Loader from "../Components/Pages/HomePage/Loader";
import Swiper from "../Components/Public/Swiper/index";
import Panel from "../Components/Pages/HomePage/Panel";

const HomePage = () => {
  const [loader, updateLoader] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideTo, setSlideToUpdate] = useState(0);
  const [images, imagesUpdate] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [activeAlbum, setActiveAlbum] = useState(null);
  const [viewMode, setViewMode] = useState("carousel");
  const albumActionsRef = useRef(null);

  const handleEnterCarousel = (index) => {
    setViewMode("carousel");
    setSlideToUpdate(index);
  };

  return (
    <Layout>
      <Swiper
        slideTo={slideTo}
        setActiveSlide={setActiveSlide}
        slides={images}
        viewMode={viewMode}
        albums={albums}
        onEnterCarousel={handleEnterCarousel}
        onAddToAlbum={(slide, albumName) =>
          albumActionsRef.current?.addImageToAlbum?.(slide, albumName)
        }
        onRemoveFromAlbum={(slide) =>
          albumActionsRef.current?.removeImageFromActiveAlbum?.(slide)
        }
      />
      <Panel
        loader={updateLoader}
        imagesUpdate={imagesUpdate}
        activeSlide={activeSlide}
        slideToUpdate={setSlideToUpdate}
        albums={albums}
        setAlbums={setAlbums}
        activeAlbum={activeAlbum}
        setActiveAlbum={setActiveAlbum}
        setViewMode={setViewMode}
        albumActionsRef={albumActionsRef}
      />
      {loader && <Loader />}
    </Layout>
  );
};

export default HomePage;

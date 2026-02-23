"use client";

import React, {useEffect} from "react";
import loaderImage from  "../../../../Resources/Pages/HomePage/img/reddit.gif";

const Loader = () => {

    useEffect(() => {
    } , [])


    return (
      <div className={"loader"}>
          <img src={loaderImage.src || loaderImage} alt=""/>
          <span>Loading ....</span>
      </div>
    );
}

export default Loader;

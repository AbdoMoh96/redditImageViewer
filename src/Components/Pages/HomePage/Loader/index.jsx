import React, {useEffect} from "react";
import "./Styles/Scss/style.scss";
import loaderImage from  '../../../../Resources/Pages/HomePage/img/reddit.gif';

const Loader = () => {

    useEffect(() => {
    } , [])


    return (
      <div className={"loader"}>
          <img src={loaderImage} alt=""/>
          <span>Loading ....</span>
      </div>
    );
}

export default Loader;
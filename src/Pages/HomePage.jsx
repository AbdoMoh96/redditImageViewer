// eslint-disable-next-line no-unused-vars
import React, {useEffect, useState} from 'react';
import Layout from "../Layout/Layout";
import '../Resources/Pages/HomePage/Scss/style.scss';
import Loader from "../Components/Pages/HomePage/Loader";
import Swiper from '../Components/Public/Swiper/index';
import Panel from "../Components/Pages/HomePage/Panel";

const HomePage = () => {

    const[loader , updateLoader] = useState(false);
    const[images , imagesUpdate] = useState([]);

    useEffect(() => {
    },[images]);

    return (
        <Layout>

            <Swiper slides={images}/>

            <Panel loader={updateLoader} imagesUpdate={imagesUpdate}/>

            { loader && <Loader/>}
        </Layout>
    );
}

export default HomePage;
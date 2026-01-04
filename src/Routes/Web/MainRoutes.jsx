import { Routes , Route} from "react-router-dom";
import HomePage from "../../Pages/HomePage";
import React from "react";


const MainRoutes = () => {

    return(
        <Routes>
            <Route  exact path="/" element={
               <HomePage />
            }/>
        </Routes>
    )
}

export default MainRoutes;
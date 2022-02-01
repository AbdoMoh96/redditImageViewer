import { Routes , Route} from "react-router-dom";
/*import Protected from "../Auth/Protected";*/
import HomePage from "../../Pages/HomePage";
import React from "react";


const MainRoutes = () => {

    return(
        <Routes>
           {/* <Route path="/" element={<Navigate replace to="/home" />} />*/}
            <Route  exact path="/" element={
               <HomePage />
            }/>
        </Routes>
    )
}

export default MainRoutes;
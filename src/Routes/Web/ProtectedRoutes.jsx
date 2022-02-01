import React from "react";
import { Routes } from "react-router-dom";
/*import HomePage from "../../Pages/HomePage";
import Protected from "../Auth/Protected";
import ProtectedRedirect from "../Auth/ProtectedRedirect";
import LoginPage from "../../Pages/Auth/LoginPage";*/

const ProtectedRoutes = () => {

    return(
        <Routes>

            {/*<Route  exact path="/home"  element={
                // login middleware  "Protected"
                <Protected>
                    <HomePage />
                </Protected>
            }/>

            <Route  exact path="/login" element={
                <ProtectedRedirect>
                    <LoginPage/>
                </ProtectedRedirect>
            }/>*/}

        </Routes>
    )
}

export default ProtectedRoutes;
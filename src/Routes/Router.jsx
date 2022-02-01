import { BrowserRouter } from "react-router-dom";
import MainRoutes from "./Web/MainRoutes";
/*import ProtectedRoutes from "./Web/ProtectedRoutes";*/

const Router = () => {
    return(
        <BrowserRouter>
            <MainRoutes/> {/*main website routes*/}
            {/*<ProtectedRoutes/>*/} {/*protected routes*/}
        </BrowserRouter>
    )
}

export default Router;
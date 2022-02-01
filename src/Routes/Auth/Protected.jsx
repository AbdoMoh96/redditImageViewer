import { Navigate } from "react-router-dom"
import {useDispatch} from "react-redux";
import {loginAction} from "../../Redux/Public/Actions/PublicUserAction";
import PublicUserSelector from "../../Redux/Public/Selectors/PublicUserSelector";




function Protected({children}) {
    const dispatch = useDispatch();
    const userState = PublicUserSelector();
    const user = JSON.parse(localStorage.getItem('user'));

    if(user !== null && userState.isLoggedIn !== true){
       dispatch(loginAction(user));
        return  children;
    }else if (userState.isLoggedIn === true){
        return  children;
    }else{
        return  <Navigate to="/login" />;
    }
}


/*function Protected({auth, children }) {
        return auth ? children : <Navigate to="/login" />;
}*/



export default Protected


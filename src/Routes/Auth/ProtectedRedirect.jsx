import { Navigate } from "react-router-dom"


function ProtectedRedirect({children }) {
    const user = JSON.parse(localStorage.getItem('user'));

    if(user !== null){
       return <Navigate exact to="/home" />;
    }else{
        return children;
    }
}

/*function ProtectedRedirect({auth, children }) {
    return auth ? children : <Navigate to="/home" />;
}*/



export default ProtectedRedirect;
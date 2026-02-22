import React from "react";
import {Main} from "./StyledComponents/style";


const Layout = (props) => {

    return(
        <Main>
            {props.children}
        </Main>
    )

}

export default Layout;

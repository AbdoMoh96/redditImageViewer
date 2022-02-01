import {useSelector} from "react-redux";


const PublicSlidesSelector = () => {
    return useSelector(state => state.PublicReducers.PublicSlidesReducer);
}

export default PublicSlidesSelector;
import { createStore ,  combineReducers } from "redux";
import PublicReducers from '../Public/Reducers/PublicReducers'


const Reducers = combineReducers({
    PublicReducers,
});

/* for development */
let Store;
if(process.env.NODE_ENV === 'development'){
    Store = createStore(Reducers, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
}else{
    Store = createStore(Reducers);
}

export default Store;
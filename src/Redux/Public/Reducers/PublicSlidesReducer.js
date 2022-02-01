const defaultState = {
/*      selectors: ['media'],*/
      slides:[]
}

const PublicSlidesReducer = (state = defaultState , action) => {
    switch (action.type){
        case 'UPDATE_PUBLIC_SLIDES':
              return {...state , slides: action.payload};
        default:
            return state;
    }

}

export default PublicSlidesReducer;
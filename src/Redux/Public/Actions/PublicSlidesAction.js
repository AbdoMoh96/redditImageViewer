
const SlidesUpdateAction = (payload) => {
    return {
        type: 'UPDATE_PUBLIC_SLIDES',
        payload: payload
    }
}


const SlidesSelectorAction = (payload) => {
    return {
        type: 'UPDATE_PUBLIC_SELECTORS',
        payload: payload
    }
}


export {SlidesUpdateAction , SlidesSelectorAction};